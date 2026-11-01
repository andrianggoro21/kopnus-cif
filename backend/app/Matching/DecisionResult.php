<?php

namespace App\Matching;

final readonly class DecisionResult
{
    public function __construct(
        public Decision $decision,
        public ?Reason $reason = null,
    ) {}
}
