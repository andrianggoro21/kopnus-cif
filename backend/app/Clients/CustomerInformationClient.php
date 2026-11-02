<?php

namespace App\Clients;

use App\Exceptions\UpstreamUnavailable;
use App\Matching\Customer;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

final class CustomerInformationClient
{
    public function all(): array
    {
        $records = Cache::remember(
            'customer_information',
            config('services.customer_info.cache_ttl'),
            fn () => $this->fetch(),
        );

        return array_map(Customer::fromArray(...), $records);
    }

    private function fetch(): array
    {
        try {
            $response = Http::timeout(config('services.http_timeout'))
                ->connectTimeout(5)
                ->acceptJson()
                ->get(config('services.customer_info.url'));
        } catch (ConnectionException $e) {
            throw new UpstreamUnavailable('Customer Information API unreachable', previous: $e);
        }

        $records = $response->json();
        if (! $response->successful() || ! is_array($records) || ! array_is_list($records)) {
            throw new UpstreamUnavailable("Customer Information API returned HTTP {$response->status()}");
        }

        return $records;
    }
}
