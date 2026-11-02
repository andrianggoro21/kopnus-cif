<?php

namespace Tests\Unit;

use App\Events\ApplicationSubmittedForReview;
use App\Listeners\QueueForCreditAnalyst;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueForCreditAnalystTest extends TestCase
{
    use RefreshDatabase;

    public function test_inserts_queue_row_once(): void
    {
        $listener = new QueueForCreditAnalyst;
        $event = new ApplicationSubmittedForReview('APP-20261102-0001');

        $listener->handle($event);
        $listener->handle($event);

        $this->assertInstanceOf(ShouldQueue::class, $listener);
        $this->assertDatabaseCount('analyst_queue', 1);
        $this->assertDatabaseHas('analyst_queue', ['application_id' => 'APP-20261102-0001']);
    }
}
