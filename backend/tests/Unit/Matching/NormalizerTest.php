<?php

namespace Tests\Unit\Matching;

use App\Matching\Normalizer;
use PHPUnit\Framework\TestCase;

class NormalizerTest extends TestCase
{
    public function test_titles_and_punctuation_removed(): void
    {
        $this->assertSame('dewi lestari', Normalizer::name('Hj. Dewi Lestari, S.E.'));
        $this->assertSame('dewi lestari', Normalizer::name('Dewi Lestari,S.E.'));
    }

    public function test_only_titles_becomes_empty(): void
    {
        $this->assertSame('', Normalizer::name('Dr. S.E.'));
    }

    public function test_whitespace_collapsed(): void
    {
        $this->assertSame('budi santoso', Normalizer::name('  Budi   Santoso '));
    }

    public function test_phone_leading_zero_to_62(): void
    {
        $this->assertSame('6281234567890', Normalizer::phone('081234567890'));
        $this->assertSame('6281234567890', Normalizer::phone('+62 812-3456-7890'));
    }
}
