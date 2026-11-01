<?php

namespace Tests\Unit\Matching;

use App\Matching\Applicant;
use App\Matching\Customer;
use PHPUnit\Framework\TestCase;

class CustomerTest extends TestCase
{
    public function test_only_active_phones_kept(): void
    {
        $records = json_decode(file_get_contents(__DIR__.'/../../../../testdata/customers.json'), true);
        $record = array_values(array_filter($records, fn ($r) => $r['NO_CIF'] === '8100000003'))[0];

        $customer = Customer::fromArray($record);

        $this->assertSame(['6285711112222'], $customer->activePhones);
    }

    public function test_names_normalized(): void
    {
        $customer = Customer::fromArray([
            'NO_CIF' => '8100000004',
            'nik' => '3578016107950004',
            'full_name' => 'Hj. Dewi Lestari, S.E.',
            'dob' => '1995-07-21',
            'spouse_name' => 'Rahmat Hidayat',
            'phones' => [],
            'flags' => [],
        ]);

        $this->assertSame('dewi lestari', $customer->fullName);
        $this->assertSame('rahmat hidayat', $customer->spouseName);
    }

    public function test_applicant_forgotten_spouse_is_null(): void
    {
        $applicant = Applicant::fromInput([
            'full_name' => 'Budi Santoso',
            'nik' => '3171011504900001',
            'dob' => '1990-04-15',
            'phone' => '',
            'spouse_name' => 'Siti Aminah',
            'spouse_forgotten' => true,
        ]);

        $this->assertNull($applicant->spouseName);
        $this->assertNull($applicant->phone);
    }
}
