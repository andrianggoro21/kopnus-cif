<?php

namespace App\Matching;

final class ConfidenceCalculator
{
    private const WEIGHTS = ['nik' => 35, 'name' => 25, 'dob' => 15, 'phone' => 15, 'spouse' => 10];

    public static function calculate(Applicant $applicant, Customer $customer): Confidence
    {
        $scores = [
            'nik' => FieldScorer::nik($applicant->nik, $customer->nik),
            'name' => FieldScorer::name($applicant->fullName, $customer->fullName),
            'dob' => FieldScorer::dob($applicant->dob, $customer->dob),
        ];
        if ($applicant->phone !== null) {
            $scores['phone'] = FieldScorer::phone($applicant->phone, $customer->activePhones);
        }
        if ($applicant->spouseName !== null) {
            $scores['spouse'] = FieldScorer::name($applicant->spouseName, $customer->spouseName);
        }

        $earned = 0.0;
        $possible = 0;
        foreach ($scores as $field => $score) {
            $earned += self::WEIGHTS[$field] * $score;
            $possible += self::WEIGHTS[$field];
        }

        return new Confidence($earned / $possible * 100, $scores);
    }

    public static function best(Applicant $applicant, array $candidates): ?array
    {
        $best = null;
        foreach ($candidates as $customer) {
            $confidence = self::calculate($applicant, $customer);
            if ($best === null || $confidence->value > $best[1]->value) {
                $best = [$customer, $confidence];
            }
        }

        return $best;
    }
}
