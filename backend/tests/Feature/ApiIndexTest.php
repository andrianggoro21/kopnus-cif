<?php

namespace Tests\Feature;

use Tests\TestCase;

class ApiIndexTest extends TestCase
{
    public function test_index_describes_the_service(): void
    {
        $this->getJson('/api')
            ->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('endpoints.0', 'POST /api/cif/check')
            ->assertJsonCount(5, 'endpoints');
    }
}
