<?php

namespace App\Clients;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

final class ScoringClient
{
    public function score(string $noCif, string $applicationId, string $nik, float $confidence): ScoreResult
    {
        try {
            $response = Http::timeout(config('services.http_timeout'))
                ->connectTimeout(5)
                ->asJson()
                ->acceptJson()
                ->post(config('services.scoring.url'), [
                    'NO_CIF' => $noCif,
                    'application_id' => $applicationId,
                    'nik' => $nik,
                    'identity_confidence' => $confidence,
                ]);
        } catch (ConnectionException) {
            return new ScoreResult(0, 'HTTP_ERROR');
        }

        if (! $response->successful()) {
            return new ScoreResult(0, 'HTTP_ERROR');
        }

        $body = $response->json();
        if (! is_array($body)) {
            return new ScoreResult(0, 'INVALID_SCORE');
        }
        if (isset($body['error']) || ($body['score'] ?? null) === null) {
            return new ScoreResult(0, $body['error'] ?? 'NULL_SCORE');
        }
        if (! is_numeric($body['score'])) {
            return new ScoreResult(0, 'INVALID_SCORE');
        }

        return new ScoreResult((float) $body['score']);
    }
}
