<?php

namespace App\Clients;

final readonly class ScoreResult
{
    public function __construct(
        public float $score,
        public ?string $error = null,
    ) {}
}
