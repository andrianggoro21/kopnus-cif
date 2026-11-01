<?php

namespace App\Matching;

final readonly class Applicant
{
    public function __construct(
        public string $nik,
        public string $fullName,
        public string $dob,
        public ?string $phone,
        public ?string $spouseName,
    ) {}

    public static function fromInput(array $validated): self
    {
        $phone = Normalizer::phone((string) ($validated['phone'] ?? ''));
        $spouse = Normalizer::name((string) ($validated['spouse_name'] ?? ''));
        $forgotten = (bool) ($validated['spouse_forgotten'] ?? false);

        return new self(
            nik: Normalizer::nik((string) $validated['nik']),
            fullName: Normalizer::name((string) $validated['full_name']),
            dob: (string) $validated['dob'],
            phone: $phone === '' ? null : $phone,
            spouseName: $spouse === '' || $forgotten ? null : $spouse,
        );
    }
}
