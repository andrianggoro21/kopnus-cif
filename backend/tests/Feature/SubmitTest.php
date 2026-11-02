<?php

namespace Tests\Feature;

use App\Events\ApplicationSubmittedForReview;
use App\Listeners\QueueForCreditAnalyst;
use App\Models\Application;
use App\Models\Document;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class SubmitTest extends TestCase
{
    use RefreshDatabase;

    private function submit(string $id, ?string $token = 'test-token')
    {
        return $this->postJson("/api/cif/{$id}/submit", [], $token === null ? [] : ['X-Application-Token' => $token]);
    }

    private function referWithDocument(): Application
    {
        $application = Application::factory()->refer()->create(['application_id' => 'APP-20261102-0001']);
        Document::factory()->for($application)->create();

        return $application;
    }

    public function test_refer_with_document_goes_in_review(): void
    {
        Event::fake([ApplicationSubmittedForReview::class]);
        $this->referWithDocument();

        $this->submit('APP-20261102-0001')
            ->assertOk()
            ->assertJsonPath('data.status', 'IN_REVIEW')
            ->assertJsonPath('data.documents.0.doc_type', 'KTP');

        $this->assertDatabaseHas('applications', ['application_id' => 'APP-20261102-0001', 'status' => 'IN_REVIEW']);
        Event::assertDispatched(ApplicationSubmittedForReview::class, fn ($e) => $e->applicationId === 'APP-20261102-0001');
    }

    public function test_listener_registered(): void
    {
        Event::fake();

        Event::assertListening(ApplicationSubmittedForReview::class, QueueForCreditAnalyst::class);
    }

    public function test_submit_writes_analyst_queue(): void
    {
        $this->referWithDocument();

        $this->submit('APP-20261102-0001')->assertOk();

        $this->assertDatabaseHas('analyst_queue', ['application_id' => 'APP-20261102-0001']);
    }

    public function test_without_documents_422(): void
    {
        Application::factory()->refer()->create(['application_id' => 'APP-20261102-0001']);

        $this->submit('APP-20261102-0001')
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Unggah minimal satu dokumen sebelum mengirim.');

        $this->assertDatabaseHas('applications', ['application_id' => 'APP-20261102-0001', 'status' => 'WAITING_DOCUMENTS']);
    }

    public function test_pass_409(): void
    {
        $application = Application::factory()->pass()->create(['application_id' => 'APP-20261102-0001']);
        Document::factory()->for($application)->create();

        $this->submit('APP-20261102-0001')->assertConflict();
    }

    public function test_submit_twice_409(): void
    {
        Event::fake([ApplicationSubmittedForReview::class]);
        $this->referWithDocument();

        $this->submit('APP-20261102-0001')->assertOk();
        $this->submit('APP-20261102-0001')->assertConflict();

        Event::assertDispatchedTimes(ApplicationSubmittedForReview::class, 1);
    }

    public function test_unknown_404(): void
    {
        $this->submit('APP-20261102-9999')->assertNotFound();
    }

    public function test_wrong_token_404(): void
    {
        $this->referWithDocument();

        $this->submit('APP-20261102-0001', 'guessed-token')->assertNotFound();
    }

    public function test_missing_token_401(): void
    {
        $this->referWithDocument();

        $this->submit('APP-20261102-0001', null)->assertUnauthorized();
    }
}
