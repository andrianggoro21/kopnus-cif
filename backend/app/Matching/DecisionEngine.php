<?php

namespace App\Matching;

final class DecisionEngine
{
    public static function decide(?Customer $best, ?float $confidence, ?float $score): DecisionResult
    {
        if ($best === null) {
            return new DecisionResult(Decision::NotPass, Reason::CifNotFound);
        }
        if (array_intersect(['BLACKLIST', 'DECEASED'], $best->flags)) {
            return new DecisionResult(Decision::NotPass, Reason::CifFlagged);
        }
        if ($confidence < 70) {
            return new DecisionResult(Decision::NotPass, Reason::LowConfidence);
        }
        if ($score < 50) {
            return new DecisionResult(Decision::NotPass, Reason::LowScore);
        }
        if ($confidence >= 90 && $score >= 80 && ! in_array('DUPLICATE_CIF', $best->flags, true)) {
            return new DecisionResult(Decision::Pass);
        }

        return new DecisionResult(Decision::Refer);
    }
}
