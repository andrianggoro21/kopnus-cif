<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class ApplicationIdGenerator
{
    public function next(): string
    {
        $today = now('Asia/Jakarta');
        $date = $today->toDateString();

        $number = DB::transaction(function () use ($date) {
            $row = DB::table('application_sequences')->where('date', $date)->lockForUpdate()->first();

            if ($row === null) {
                DB::table('application_sequences')->insert(['date' => $date, 'last_number' => 1]);

                return 1;
            }

            DB::table('application_sequences')->where('date', $date)->increment('last_number');

            return $row->last_number + 1;
        });

        return sprintf('APP-%s-%04d', $today->format('Ymd'), $number);
    }
}
