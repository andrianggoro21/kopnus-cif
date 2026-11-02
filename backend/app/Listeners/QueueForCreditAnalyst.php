<?php

namespace App\Listeners;

use App\Events\ApplicationSubmittedForReview;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class QueueForCreditAnalyst implements ShouldQueue
{
    public function handle(ApplicationSubmittedForReview $event): void
    {
        DB::table('analyst_queue')->insertOrIgnore(['application_id' => $event->applicationId, 'queued_at' => now()]);
        Log::info('application queued for analyst', ['application_id' => $event->applicationId]);
    }
}
