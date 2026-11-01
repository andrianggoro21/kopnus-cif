<?php

namespace App\Matching;

final readonly class Customer
{
    public function __construct(
        public string $noCif,
        public string $nik,
        public string $fullName,
        public string $dob,
        public string $spouseName,
        public array $activePhones,
        public array $flags,
    ) {}

    public static function fromArray(array $r): self
    {
        $active = array_filter($r['phones'] ?? [], fn (array $p) => ($p['status'] ?? null) === 'ACTIVE');

        return new self(
            noCif: (string) $r['NO_CIF'],
            nik: Normalizer::nik((string) $r['nik']),
            fullName: Normalizer::name((string) $r['full_name']),
            dob: (string) $r['dob'],
            spouseName: Normalizer::name((string) ($r['spouse_name'] ?? '')),
            activePhones: array_values(array_map(fn (array $p) => Normalizer::phone((string) $p['number']), $active)),
            flags: array_values($r['flags'] ?? []),
        );
    }
}
