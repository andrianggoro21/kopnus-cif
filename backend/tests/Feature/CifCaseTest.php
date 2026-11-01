<?php

namespace Tests\Feature;

use App\Models\Application;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\FakesUpstream;
use Tests\TestCase;

class CifCaseTest extends TestCase
{
    use FakesUpstream;
    use RefreshDatabase;

    public static function cases(): array
    {
        $cases = json_decode(file_get_contents(__DIR__.'/../../../testdata/cases.json'), true);

        return array_combine(array_map(fn (array $c) => 'case '.$c['no'], $cases), array_map(fn (array $c) => [$c], $cases));
    }

    private function input(int $no): array
    {
        return self::cases()["case {$no}"][0]['input'];
    }

    #[DataProvider('cases')]
    public function test_case(array $case): void
    {
        $this->fakeUpstream();
        $expected = $case['expected'];

        $response = $this->postJson('/api/cif/check', $case['input']);

        $response->assertCreated()->assertJsonPath('data.decision', $expected['decision']);
        $data = $response->json('data');
        if ($expected['confidence'] === null) {
            $this->assertNull($data['identity_confidence']);
        } else {
            $this->assertEqualsWithDelta($expected['confidence'], $data['identity_confidence'], 0.01);
        }
        $this->assertEquals($expected['score'], $data['credit_score']);

        $application = Application::where('application_id', $data['application_id'])->sole();
        $this->assertSame($expected['no_cif'], $application->matched_no_cif);
        $this->assertSame($expected['reason'], $application->reason?->value);

        if ($expected['no_cif'] === null) {
            Http::assertNotSent(fn (Request $r) => $r->url() === config('services.scoring.url'));
        }
    }

    public function test_response_hides_internal_fields(): void
    {
        $this->fakeUpstream();

        foreach ([4, 6] as $no) {
            $this->postJson('/api/cif/check', $this->input($no))
                ->assertCreated()
                ->assertJsonMissingPath('data.matched_no_cif')
                ->assertJsonMissingPath('data.reason')
                ->assertJsonMissingPath('data.candidates')
                ->assertJsonMissingPath('data.scoring_error')
                ->assertJsonMissingPath('data.nik');
        }
    }

    public function test_refer_waits_for_documents(): void
    {
        $this->fakeUpstream();

        $this->postJson('/api/cif/check', $this->input(4))
            ->assertCreated()
            ->assertJsonPath('data.status', 'WAITING_DOCUMENTS')
            ->assertJsonPath('data.documents_required', true)
            ->assertJsonPath('data.loan', ['type' => 'KTA', 'amount' => 50000000, 'tenor_months' => 12])
            ->assertJsonPath('data.documents', []);
    }

    public function test_access_token_returned_once_and_stored_hashed(): void
    {
        $this->fakeUpstream();

        $data = $this->postJson('/api/cif/check', $this->input(1))->assertCreated()->json('data');

        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $data['access_token']);
        $application = Application::where('application_id', $data['application_id'])->sole();
        $this->assertSame(hash('sha256', $data['access_token']), $application->access_token_hash);

        $this->getJson("/api/cif/{$data['application_id']}", ['X-Application-Token' => $data['access_token']])
            ->assertOk()
            ->assertJsonPath('data.application_id', $data['application_id']);
    }

    public function test_new_application_id_each_submit(): void
    {
        $this->fakeUpstream();

        $first = $this->postJson('/api/cif/check', $this->input(1))->json('data.application_id');
        $second = $this->postJson('/api/cif/check', $this->input(1))->json('data.application_id');

        $this->assertMatchesRegularExpression('/^APP-\d{8}-\d{4}$/', $first);
        $this->assertNotSame($first, $second);
    }

    public function test_scoring_error_is_stored(): void
    {
        $this->fakeUpstream(['8100000001' => ['score' => null, 'error' => 'UPSTREAM_TIMEOUT']]);

        $id = $this->postJson('/api/cif/check', $this->input(1))
            ->assertCreated()
            ->assertJsonPath('data.decision', 'NOT_PASS')
            ->json('data.application_id');

        $this->assertDatabaseHas('applications', ['application_id' => $id, 'scoring_error' => 'UPSTREAM_TIMEOUT', 'reason' => 'LOW_SCORE']);
    }

    public function test_customer_api_down_returns_503(): void
    {
        Http::preventStrayRequests();
        Http::fake([config('services.customer_info.url') => Http::response('error', 500)]);

        $this->postJson('/api/cif/check', $this->input(1))
            ->assertStatus(503)
            ->assertJsonPath('message', 'Layanan data nasabah sedang tidak dapat dihubungi. Silakan coba beberapa saat lagi.');

        $this->assertDatabaseCount('applications', 0);
        $this->assertDatabaseCount('application_sequences', 0);
    }

    public function test_throttled_after_30_requests_per_minute(): void
    {
        for ($i = 0; $i < 30; $i++) {
            $this->postJson('/api/cif/check', [])->assertStatus(422);
        }

        $this->postJson('/api/cif/check', [])->assertStatus(429);
    }
}
