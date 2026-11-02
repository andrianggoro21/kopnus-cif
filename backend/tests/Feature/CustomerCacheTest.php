<?php

namespace Tests\Feature;

use App\Clients\CustomerInformationClient;
use App\Exceptions\UpstreamUnavailable;
use App\Matching\Customer;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\FakesUpstream;
use Tests\TestCase;

class CustomerCacheTest extends TestCase
{
    use FakesUpstream;

    public function test_second_call_uses_cache(): void
    {
        $this->fakeUpstream();
        $client = app(CustomerInformationClient::class);

        $first = $client->all();
        $client->all();

        Http::assertSentCount(1);
        $this->assertCount(100, $first);
        $this->assertInstanceOf(Customer::class, $first[0]);
    }

    public function test_failure_throws_and_is_not_cached(): void
    {
        Http::preventStrayRequests();
        Http::fake([
            config('services.customer_info.url') => Http::sequence()
                ->push('error', 500)
                ->push($this->testdata('customers.json')),
        ]);
        $client = app(CustomerInformationClient::class);

        try {
            $client->all();
            $this->fail('Expected UpstreamUnavailable');
        } catch (UpstreamUnavailable) {
        }

        $this->assertCount(100, $client->all());
        $client->all();
        Http::assertSentCount(2);
    }

    public function test_non_array_body_throws(): void
    {
        Http::preventStrayRequests();
        Http::fake([config('services.customer_info.url') => Http::response('<html>maintenance</html>')]);

        $this->expectException(UpstreamUnavailable::class);
        app(CustomerInformationClient::class)->all();
    }

    public function test_object_body_throws(): void
    {
        Http::preventStrayRequests();
        Http::fake([config('services.customer_info.url') => Http::response(['message' => 'quota exceeded'])]);

        $this->expectException(UpstreamUnavailable::class);
        app(CustomerInformationClient::class)->all();
    }

    public function test_connection_failure_throws(): void
    {
        Http::preventStrayRequests();
        Http::fake([config('services.customer_info.url') => Http::failedConnection()]);

        $this->expectException(UpstreamUnavailable::class);
        app(CustomerInformationClient::class)->all();
    }
}
