<?php

namespace Tests\Unit\Matching;

use App\Matching\Applicant;
use App\Matching\CandidateSelector;
use App\Matching\Customer;
use PHPUnit\Framework\TestCase;

class CandidateSelectorTest extends TestCase
{
    private function customers(): array
    {
        $records = json_decode(file_get_contents(__DIR__.'/../../../../testdata/customers.json'), true);

        return array_map(Customer::fromArray(...), $records);
    }

    private function customer(string $noCif, string $nik, array $phones = []): Customer
    {
        return new Customer($noCif, $nik, 'budi santoso', '1990-04-15', '', $phones, []);
    }

    private function applicant(string $nik, ?string $phone = null): Applicant
    {
        return new Applicant($nik, 'budi santoso', '1990-04-15', $phone, null);
    }

    public function test_no_candidate_for_case_10(): void
    {
        $applicant = Applicant::fromInput([
            'full_name' => 'Rudi Hartono',
            'nik' => '3174052208910005',
            'dob' => '1991-08-22',
            'phone' => '081277778888',
        ]);

        $this->assertSame([], CandidateSelector::select($applicant, $this->customers()));
    }

    public function test_limits_to_five_sorted_by_nik_distance(): void
    {
        $customers = [
            $this->customer('A', '1000000000000022'),
            $this->customer('B', '1000000000000001'),
            $this->customer('C', '1000000000000000'),
            $this->customer('D', '1000000000000033'),
            $this->customer('E', '1000000000000002'),
            $this->customer('F', '1000000000000044'),
            $this->customer('G', '1000000000000003'),
            $this->customer('H', '9999999999999999'),
        ];

        $selected = CandidateSelector::select($this->applicant('1000000000000000'), $customers);

        $this->assertSame(['C', 'B', 'E', 'G', 'A'], array_map(fn (Customer $c) => $c->noCif, $selected));
    }

    public function test_phone_only_candidate(): void
    {
        $customers = [$this->customer('A', '9999999999999999', ['6281234567890'])];

        $selected = CandidateSelector::select($this->applicant('1000000000000000', '6281234567891'), $customers);

        $this->assertSame(['A'], array_map(fn (Customer $c) => $c->noCif, $selected));
    }

    public function test_inactive_phone_not_matched(): void
    {
        $customer = Customer::fromArray([
            'NO_CIF' => 'A',
            'nik' => '9999999999999999',
            'full_name' => 'Budi Santoso',
            'dob' => '1990-04-15',
            'phones' => [
                ['number' => '6281111111111', 'status' => 'ACTIVE'],
                ['number' => '6289999999999', 'status' => 'INACTIVE'],
            ],
            'flags' => [],
        ]);

        $this->assertSame([], CandidateSelector::select($this->applicant('1000000000000000', '6289999999999'), [$customer]));
        $this->assertCount(1, CandidateSelector::select($this->applicant('1000000000000000', '6281111111111'), [$customer]));
    }
}
