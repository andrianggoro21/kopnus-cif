<?php

namespace App\Matching;

final readonly class Confidence
{
    public function __construct(
        public float $value,
        public array $scores,
    ) {}
}
