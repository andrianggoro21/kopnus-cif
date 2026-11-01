<?php

namespace App\Matching;

final class CandidateSelector
{
    private const LIMIT = 5;

    public static function select(Applicant $applicant, array $customers): array
    {
        $candidates = [];
        foreach ($customers as $customer) {
            $distance = levenshtein($applicant->nik, $customer->nik);
            if ($distance <= 2 || self::phoneMatches($applicant, $customer)) {
                $candidates[] = [$distance, $customer];
            }
        }

        usort($candidates, fn (array $a, array $b) => $a[0] <=> $b[0]);

        return array_map(fn (array $c) => $c[1], array_slice($candidates, 0, self::LIMIT));
    }

    private static function phoneMatches(Applicant $applicant, Customer $customer): bool
    {
        if ($applicant->phone === null) {
            return false;
        }

        foreach ($customer->activePhones as $number) {
            if (levenshtein($applicant->phone, $number) <= 1) {
                return true;
            }
        }

        return false;
    }
}
