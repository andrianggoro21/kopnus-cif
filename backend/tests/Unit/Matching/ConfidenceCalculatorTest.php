<?php

namespace Tests\Unit\Matching;

use App\Matching\Applicant;
use App\Matching\ConfidenceCalculator;
use App\Matching\Customer;
use PHPUnit\Framework\TestCase;

class ConfidenceCalculatorTest extends TestCase
{
    private function budi(): Customer
    {
        return Customer::fromArray([
            'NO_CIF' => '8100000001',
            'nik' => '3171011504900001',
            'full_name' => 'Budi Santoso',
            'dob' => '1990-04-15',
            'spouse_name' => 'Siti Aminah',
            'phones' => [['number' => '6281234567890', 'status' => 'ACTIVE']],
            'flags' => [],
        ]);
    }

    public function test_all_match_except_phone_is_85(): void
    {
        $applicant = Applicant::fromInput([
            'full_name' => 'Budi Santoso',
            'nik' => '3171011504900001',
            'dob' => '1990-04-15',
            'phone' => '081200000000',
            'spouse_name' => 'Siti Aminah',
        ]);

        $confidence = ConfidenceCalculator::calculate($applicant, $this->budi());

        $this->assertEqualsWithDelta(85.0, $confidence->value, 0.0001);
        $this->assertSame(['nik', 'name', 'dob', 'phone', 'spouse'], array_keys($confidence->scores));
    }

    public function test_phone_and_spouse_empty_wrong_dob_is_64_46(): void
    {
        $applicant = Applicant::fromInput([
            'full_name' => 'Joko Prasetyo',
            'nik' => '3171011504900001',
            'dob' => '1991-01-01',
        ]);

        $confidence = ConfidenceCalculator::calculate($applicant, $this->budi());

        $this->assertEqualsWithDelta(64.46, $confidence->value, 0.01);
        $this->assertSame(['nik', 'name', 'dob'], array_keys($confidence->scores));
    }

    public function test_spouse_forgotten_excludes_spouse(): void
    {
        $applicant = Applicant::fromInput([
            'full_name' => 'Budi Santoso',
            'nik' => '3171011504900001',
            'dob' => '1990-04-15',
            'phone' => '081234567890',
            'spouse_name' => 'Orang Lain',
            'spouse_forgotten' => true,
        ]);

        $confidence = ConfidenceCalculator::calculate($applicant, $this->budi());

        $this->assertSame(100.0, $confidence->value);
        $this->assertArrayNotHasKey('spouse', $confidence->scores);
    }

    public function test_best_prefers_highest_then_selection_order(): void
    {
        $applicant = Applicant::fromInput([
            'full_name' => 'Budi Santoso',
            'nik' => '3171011504900001',
            'dob' => '1990-04-15',
        ]);
        $exact = $this->budi();
        $twin = new Customer('8100000099', $exact->nik, $exact->fullName, $exact->dob, '', [], []);
        $weaker = new Customer('8100000098', '3171011504900002', 'budi', '1990-04-15', '', [], []);

        [$best, $confidence] = ConfidenceCalculator::best($applicant, [$weaker, $exact, $twin]);

        $this->assertSame('8100000001', $best->noCif);
        $this->assertSame(100.0, $confidence->value);
        $this->assertNull(ConfidenceCalculator::best($applicant, []));
    }
}
