<?php

namespace App\Matching;

final class FieldScorer
{
    public static function nik(string $input, string $record): float
    {
        return match (levenshtein(Normalizer::nik($input), Normalizer::nik($record))) {
            0 => 1.0,
            1 => 0.9,
            default => 0.0,
        };
    }

    public static function name(string $input, string $record): float
    {
        $similarity = JaroWinkler::similarity($input, $record);

        return $similarity >= 0.92 ? 1.0 : $similarity;
    }

    public static function dob(string $input, string $record): float
    {
        if ($input === $record) {
            return 1.0;
        }

        [$y, $m, $d] = array_map('intval', explode('-', $input) + [0, 0, 0]);

        return checkdate($d, $m, $y) && sprintf('%04d-%02d-%02d', $y, $d, $m) === $record ? 0.8 : 0.0;
    }

    public static function phone(string $input, array $recordNumbers): float
    {
        $input = Normalizer::phone($input);
        if ($input === '') {
            return 0.0;
        }

        foreach ($recordNumbers as $number) {
            if (levenshtein($input, Normalizer::phone($number)) <= 1) {
                return 1.0;
            }
        }

        return 0.0;
    }
}
