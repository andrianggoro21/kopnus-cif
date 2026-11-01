<?php

namespace App\Matching;

final class Normalizer
{
    private const TITLES = ['hj', 'h', 'dr', 'ir', 'se', 'skom', 'mt', 'st', 'sh', 'mm', 'msi', 'spd'];

    public static function name(string $value): string
    {
        $value = str_replace(['.', ','], ['', ' '], mb_strtolower($value));
        $tokens = preg_split('/\s+/u', $value, -1, PREG_SPLIT_NO_EMPTY);

        return implode(' ', array_filter($tokens, fn (string $t) => ! in_array($t, self::TITLES, true)));
    }

    public static function phone(string $value): string
    {
        $digits = preg_replace('/\D/', '', $value);

        return str_starts_with($digits, '0') ? '62'.substr($digits, 1) : $digits;
    }

    public static function nik(string $value): string
    {
        return preg_replace('/\D/', '', $value);
    }
}
