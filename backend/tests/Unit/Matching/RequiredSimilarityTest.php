<?php

namespace Tests\Unit\Matching;

use App\Matching\FieldScorer;
use App\Matching\JaroWinkler;
use App\Matching\Normalizer;
use PHPUnit\Framework\TestCase;

class RequiredSimilarityTest extends TestCase
{
    public function test_siti_nur_haliza(): void
    {
        $a = Normalizer::name('Siti Nur Haliza');
        $b = Normalizer::name('Siti Nurhaliza');

        $this->assertEqualsWithDelta(0.987, JaroWinkler::similarity($a, $b), 0.001);
        $this->assertSame(1.0, FieldScorer::name($a, $b));
    }

    public function test_title_removed_dewi_lestari(): void
    {
        $this->assertSame(1.0, FieldScorer::name(Normalizer::name('Hj. Dewi Lestari, S.E.'), Normalizer::name('Dewi Lestari')));
    }

    public function test_fajar_nugraha_vs_nugroho(): void
    {
        $a = Normalizer::name('Fajar Nugraha');
        $b = Normalizer::name('Fajar Nugroho');

        $this->assertEqualsWithDelta(0.938, JaroWinkler::similarity($a, $b), 0.001);
        $this->assertSame(1.0, FieldScorer::name($a, $b));
    }

    public function test_phone_formats(): void
    {
        $this->assertSame(1.0, FieldScorer::phone('+62 812-3456-7890', ['6281234567890']));
        $this->assertSame(1.0, FieldScorer::phone('+62 812-3456-7890', [Normalizer::phone('081234567890')]));
    }

    public function test_nik_one_digit(): void
    {
        $this->assertSame(0.9, FieldScorer::nik('3171011504900001', '3171011504900002'));
    }

    public function test_dob_day_month_swapped(): void
    {
        $this->assertSame(0.8, FieldScorer::dob('1993-06-10', '1993-10-06'));
    }
}
