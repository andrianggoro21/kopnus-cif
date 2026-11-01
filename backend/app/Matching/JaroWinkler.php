<?php

namespace App\Matching;

final class JaroWinkler
{
    public static function similarity(string $a, string $b): float
    {
        if ($a === '' && $b === '') {
            return 1.0;
        }
        if ($a === '' || $b === '') {
            return 0.0;
        }

        $s1 = mb_str_split($a);
        $s2 = mb_str_split($b);
        $len1 = count($s1);
        $len2 = count($s2);
        $window = max(intdiv(max($len1, $len2), 2) - 1, 0);

        $matched1 = array_fill(0, $len1, false);
        $matched2 = array_fill(0, $len2, false);
        $matches = 0;

        for ($i = 0; $i < $len1; $i++) {
            $from = max(0, $i - $window);
            $to = min($i + $window + 1, $len2);
            for ($j = $from; $j < $to; $j++) {
                if (! $matched2[$j] && $s1[$i] === $s2[$j]) {
                    $matched1[$i] = $matched2[$j] = true;
                    $matches++;
                    break;
                }
            }
        }

        if ($matches === 0) {
            return 0.0;
        }

        $transpositions = 0;
        $k = 0;
        for ($i = 0; $i < $len1; $i++) {
            if (! $matched1[$i]) {
                continue;
            }
            while (! $matched2[$k]) {
                $k++;
            }
            if ($s1[$i] !== $s2[$k]) {
                $transpositions++;
            }
            $k++;
        }

        $jaro = ($matches / $len1 + $matches / $len2 + ($matches - $transpositions / 2) / $matches) / 3;

        $prefix = 0;
        while ($prefix < min(4, $len1, $len2) && $s1[$prefix] === $s2[$prefix]) {
            $prefix++;
        }

        return $jaro + $prefix * 0.1 * (1 - $jaro);
    }
}
