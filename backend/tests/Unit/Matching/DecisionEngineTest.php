<?php

namespace Tests\Unit\Matching;

use App\Matching\Customer;
use App\Matching\Decision;
use App\Matching\DecisionEngine;
use App\Matching\Reason;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class DecisionEngineTest extends TestCase
{
    private function customer(array $flags = []): Customer
    {
        return new Customer('8100000001', '3171011504900001', 'budi santoso', '1990-04-15', '', [], $flags);
    }

    public static function thresholds(): array
    {
        return [
            'conf 70 score 50 refer' => [70.0, 50.0, Decision::Refer, null],
            'conf 69.99 not pass' => [69.99, 100.0, Decision::NotPass, Reason::LowConfidence],
            'conf 90 score 80 pass' => [90.0, 80.0, Decision::Pass, null],
            'conf 89.99 refer' => [89.99, 100.0, Decision::Refer, null],
            'score 49.99 not pass' => [100.0, 49.99, Decision::NotPass, Reason::LowScore],
            'score 79.99 refer' => [100.0, 79.99, Decision::Refer, null],
        ];
    }

    #[DataProvider('thresholds')]
    public function test_thresholds(float $confidence, float $score, Decision $decision, ?Reason $reason): void
    {
        $result = DecisionEngine::decide($this->customer(), $confidence, $score);

        $this->assertSame($decision, $result->decision);
        $this->assertSame($reason, $result->reason);
    }

    public function test_blacklist_is_flagged(): void
    {
        $result = DecisionEngine::decide($this->customer(['BLACKLIST']), 100.0, 100.0);

        $this->assertSame(Decision::NotPass, $result->decision);
        $this->assertSame(Reason::CifFlagged, $result->reason);
    }

    public function test_deceased_is_flagged(): void
    {
        $result = DecisionEngine::decide($this->customer(['DECEASED']), 100.0, 100.0);

        $this->assertSame(Decision::NotPass, $result->decision);
        $this->assertSame(Reason::CifFlagged, $result->reason);
    }

    public function test_duplicate_cif_downgrades_pass_to_refer(): void
    {
        $result = DecisionEngine::decide($this->customer(['DUPLICATE_CIF']), 100.0, 100.0);

        $this->assertSame(Decision::Refer, $result->decision);
        $this->assertNull($result->reason);
    }

    public function test_no_candidate_is_cif_not_found(): void
    {
        $result = DecisionEngine::decide(null, null, null);

        $this->assertSame(Decision::NotPass, $result->decision);
        $this->assertSame(Reason::CifNotFound, $result->reason);
    }
}
