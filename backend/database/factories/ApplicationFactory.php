<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class ApplicationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'application_id' => fake()->unique()->numerify('APP-20261101-####'),
            'full_name' => 'Budi Santoso',
            'nik' => '3171011504900001',
            'dob' => '1990-04-15',
            'phone' => '081234567890',
            'marital_status' => 'KAWIN',
            'spouse_name' => 'Siti Aminah',
            'spouse_forgotten' => false,
            'loan_type' => 'KTA',
            'loan_amount' => 50000000,
            'loan_tenor_months' => 12,
            'decision' => 'PASS',
            'reason' => null,
            'identity_confidence' => 100.0,
            'credit_score' => 85.0,
            'scoring_error' => null,
            'matched_no_cif' => '8100000001',
            'candidates' => [],
            'status' => 'COMPLETED',
        ];
    }

    public function pass(): static
    {
        return $this->state(['decision' => 'PASS', 'reason' => null, 'status' => 'COMPLETED']);
    }

    public function refer(): static
    {
        return $this->state(['decision' => 'REFER', 'reason' => null, 'identity_confidence' => 85.0, 'status' => 'WAITING_DOCUMENTS']);
    }

    public function notPass(): static
    {
        return $this->state(['decision' => 'NOT_PASS', 'reason' => 'LOW_SCORE', 'credit_score' => 45.0, 'status' => 'COMPLETED']);
    }

    public function inReview(): static
    {
        return $this->refer()->state(['status' => 'IN_REVIEW']);
    }
}
