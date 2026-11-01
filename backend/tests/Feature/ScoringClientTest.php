<?php

namespace Tests\Feature;

use App\Clients\ScoringClient;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\FakesUpstream;
use Tests\TestCase;

class ScoringClientTest extends TestCase
{
    use FakesUpstream;

    private function score(string $noCif): array
    {
        $result = app(ScoringClient::class)->score($noCif, 'APP-20261101-0001', '3171011504900001', 100.0);

        return [$result->score, $result->error];
    }

    public function test_string_score_cast_to_float(): void
    {
        $this->fakeUpstream();

        $this->assertSame([79.5, null], $this->score('8100000003'));
    }

    public function test_upstream_timeout_is_zero(): void
    {
        $this->fakeUpstream();

        $this->assertSame([0.0, 'UPSTREAM_TIMEOUT'], $this->score('8100000007'));
    }

    public function test_unknown_cif_is_zero(): void
    {
        $this->fakeUpstream();

        $this->assertSame([0.0, 'CUSTOMER_NOT_FOUND'], $this->score('8199999999'));
    }

    public function test_null_score_is_zero(): void
    {
        $this->fakeUpstream(['8100000001' => ['score' => null]]);

        $this->assertSame([0.0, 'NULL_SCORE'], $this->score('8100000001'));
    }

    public function test_non_numeric_score(): void
    {
        $this->fakeUpstream(['8100000001' => ['score' => 'abc']]);

        $this->assertSame([0.0, 'INVALID_SCORE'], $this->score('8100000001'));
    }

    public function test_non_json_body_is_invalid(): void
    {
        Http::preventStrayRequests();
        Http::fake([config('services.scoring.url') => Http::response('<html>oops</html>')]);

        $this->assertSame([0.0, 'INVALID_SCORE'], $this->score('8100000001'));
    }

    public function test_http_500_is_zero(): void
    {
        Http::preventStrayRequests();
        Http::fake([config('services.scoring.url') => Http::response('error', 500)]);

        $this->assertSame([0.0, 'HTTP_ERROR'], $this->score('8100000001'));
    }

    public function test_connection_failure_is_zero(): void
    {
        Http::preventStrayRequests();
        Http::fake([config('services.scoring.url') => Http::failedConnection()]);

        $this->assertSame([0.0, 'HTTP_ERROR'], $this->score('8100000001'));
    }

    public function test_sends_required_fields(): void
    {
        $this->fakeUpstream();

        $this->score('8100000001');

        Http::assertSent(fn (Request $request) => $request->url() === config('services.scoring.url')
            && $request->method() === 'POST'
            && $request->hasHeader('Content-Type', 'application/json')
            && $request->data() === [
                'NO_CIF' => '8100000001',
                'application_id' => 'APP-20261101-0001',
                'nik' => '3171011504900001',
                'identity_confidence' => 100.0,
            ]);
    }
}
