<?php

namespace Tests\Concerns;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

trait FakesUpstream
{
    protected function testdata(string $file): array
    {
        return json_decode(file_get_contents(base_path('../testdata/'.$file)), true);
    }

    protected function fakeUpstream(?array $scoring = null): void
    {
        $scoring ??= $this->testdata('scoring.json');

        Http::preventStrayRequests();
        Http::fake([
            config('services.customer_info.url') => Http::response($this->testdata('customers.json')),
            config('services.scoring.url') => fn (Request $request) => Http::response(
                $scoring[$request['NO_CIF']] ?? ['score' => null, 'error' => 'CUSTOMER_NOT_FOUND'],
            ),
        ]);
    }
}
