<?php

namespace Tests\Unit\Matching;

use App\Matching\FieldScorer;
use PHPUnit\Framework\TestCase;

class FieldScorerTest extends TestCase
{
    public function test_empty_name_scores_zero(): void
    {
        $this->assertSame(0.0, FieldScorer::name('', 'budi santoso'));
    }

    public function test_dob_unswappable_day_over_12(): void
    {
        $this->assertSame(0.0, FieldScorer::dob('1993-06-25', '1993-25-06'));
    }

    public function test_dob_exact(): void
    {
        $this->assertSame(1.0, FieldScorer::dob('1990-04-15', '1990-04-15'));
    }

    public function test_nik_distance_two_is_zero(): void
    {
        $this->assertSame(0.0, FieldScorer::nik('3171011504900001', '3171011504900022'));
    }

    public function test_phone_without_match_is_zero(): void
    {
        $this->assertSame(0.0, FieldScorer::phone('081200000000', ['6285799001122']));
    }
}
