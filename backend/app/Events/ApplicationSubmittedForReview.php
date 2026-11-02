<?php

namespace App\Events;

class ApplicationSubmittedForReview
{
    public function __construct(public string $applicationId) {}
}
