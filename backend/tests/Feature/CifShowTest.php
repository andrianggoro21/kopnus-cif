<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Document;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CifShowTest extends TestCase
{
    use RefreshDatabase;

    private function show(string $id, ?string $token = 'test-token')
    {
        return $this->getJson("/api/cif/{$id}", $token === null ? [] : ['X-Application-Token' => $token]);
    }

    public function test_existing_application_with_documents(): void
    {
        $application = Application::factory()->refer()->create(['application_id' => 'APP-20261101-0007']);
        $document = Document::factory()->for($application)->create();

        $this->show('APP-20261101-0007')
            ->assertOk()
            ->assertJsonPath('data.application_id', 'APP-20261101-0007')
            ->assertJsonPath('data.decision', 'REFER')
            ->assertJsonPath('data.status', 'WAITING_DOCUMENTS')
            ->assertJsonPath('data.documents_required', true)
            ->assertJsonPath('data.documents.0', [
                'upload_id' => $document->id,
                'file_name' => 'ktp.jpg',
                'doc_type' => 'KTP',
                'status' => 'COMPLETED',
                'url' => "/api/uploads/{$document->id}",
            ])
            ->assertJsonMissingPath('data.matched_no_cif')
            ->assertJsonMissingPath('data.reason')
            ->assertJsonMissingPath('data.access_token')
            ->assertJsonMissingPath('data.access_token_hash');
    }

    public function test_missing_token_401(): void
    {
        Application::factory()->create(['application_id' => 'APP-20261101-0007']);

        $this->show('APP-20261101-0007', null)
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Header X-Application-Token wajib diisi.');
    }

    public function test_wrong_token_looks_like_not_found(): void
    {
        Application::factory()->create(['application_id' => 'APP-20261101-0007']);

        $this->show('APP-20261101-0007', 'guessed-token')
            ->assertNotFound()
            ->assertJsonPath('message', 'Pengajuan tidak ditemukan.');
    }

    public function test_unknown_application_404(): void
    {
        $this->show('APP-20261101-9999')
            ->assertNotFound()
            ->assertJsonPath('message', 'Pengajuan tidak ditemukan.');
    }
}
