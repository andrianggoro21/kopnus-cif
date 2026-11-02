<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Document;
use App\Services\ApplicationIdGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ApplicationIdGeneratorTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::parse('2026-11-01 20:15:00', 'Asia/Jakarta'));
    }

    public function test_first_id_of_day_is_0001(): void
    {
        $this->assertSame('APP-20261101-0001', app(ApplicationIdGenerator::class)->next());
    }

    public function test_sequential_ids(): void
    {
        $generator = app(ApplicationIdGenerator::class);

        $this->assertSame(
            ['APP-20261101-0001', 'APP-20261101-0002', 'APP-20261101-0003'],
            [$generator->next(), $generator->next(), $generator->next()],
        );
    }

    public function test_resets_next_day(): void
    {
        $generator = app(ApplicationIdGenerator::class);
        $generator->next();
        $generator->next();

        $this->travelTo(Carbon::parse('2026-11-02 08:00:00', 'Asia/Jakarta'));

        $this->assertSame('APP-20261102-0001', $generator->next());
    }

    public function test_uses_jakarta_date_not_utc(): void
    {
        $this->travelTo(Carbon::parse('2026-11-01 18:30:00', 'UTC'));

        $this->assertSame('APP-20261102-0001', app(ApplicationIdGenerator::class)->next());
    }

    public function test_factories_and_relations(): void
    {
        $application = Application::factory()->refer()->create();
        Document::factory()->for($application)->create();

        $this->assertSame('WAITING_DOCUMENTS', $application->status);
        $this->assertSame('REFER', $application->decision->value);
        $this->assertCount(1, $application->documents);
    }
}
