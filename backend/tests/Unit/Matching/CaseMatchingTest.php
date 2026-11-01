<?php

namespace Tests\Unit\Matching;

use App\Matching\Applicant;
use App\Matching\CandidateSelector;
use App\Matching\ConfidenceCalculator;
use App\Matching\Customer;
use App\Matching\DecisionEngine;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class CaseMatchingTest extends TestCase
{
    private const TESTDATA = __DIR__.'/../../../../testdata/';

    public static function cases(): array
    {
        $cases = json_decode(file_get_contents(self::TESTDATA.'cases.json'), true);

        return array_combine(array_map(fn (array $c) => 'case '.$c['no'], $cases), array_map(fn (array $c) => [$c], $cases));
    }

    #[DataProvider('cases')]
    public function test_case(array $case): void
    {
        $customers = array_map(Customer::fromArray(...), json_decode(file_get_contents(self::TESTDATA.'customers.json'), true));
        $scoring = json_decode(file_get_contents(self::TESTDATA.'scoring.json'), true);
        $expected = $case['expected'];

        $applicant = Applicant::fromInput($case['input']);
        $best = ConfidenceCalculator::best($applicant, CandidateSelector::select($applicant, $customers));
        [$customer, $confidence] = $best ?? [null, null];
        $score = $customer ? (float) ($scoring[$customer->noCif]['score'] ?? 0) : null;
        $result = DecisionEngine::decide($customer, $confidence?->value, $score);

        $this->assertSame($expected['no_cif'], $customer?->noCif);
        if ($expected['confidence'] === null) {
            $this->assertNull($confidence);
        } else {
            $this->assertEqualsWithDelta($expected['confidence'], $confidence->value, 0.01);
        }
        $this->assertSame($expected['score'] === null ? null : (float) $expected['score'], $score);
        $this->assertSame($expected['decision'], $result->decision->value);
        $this->assertSame($expected['reason'], $result->reason?->value);
    }
}
