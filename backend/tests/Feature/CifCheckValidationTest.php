<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\FakesUpstream;
use Tests\TestCase;

class CifCheckValidationTest extends TestCase
{
    use FakesUpstream;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::parse('2026-11-01 01:30:00', 'Asia/Jakarta'));
        $this->fakeUpstream();
    }

    private function payload(array $overrides): array
    {
        $payload = array_merge([
            'full_name' => 'Budi Santoso',
            'nik' => '3171011504900001',
            'dob' => '1990-04-15',
            'phone' => '081234567890',
            'marital_status' => 'KAWIN',
            'spouse_name' => 'Siti Aminah',
            'loan_type' => 'KTA',
            'loan_amount' => 50000000,
            'loan_tenor_months' => 12,
        ], $overrides);

        return array_filter($payload, fn ($v) => $v !== '__unset');
    }

    public static function valid(): array
    {
        return [
            'name with titles' => [['full_name' => 'Hj. Dewi Lestari, S.E.']],
            'name with apostrophe and dash' => [['full_name' => "Ni'mah Az-Zahra"]],
            'nik with spaces' => [['nik' => '3171 0115 0490 0001']],
            'dob today in jakarta' => [['dob' => '2026-11-01']],
            'phone +62 with separators' => [['phone' => '+62 812-3456-7890']],
            'phone 08 with dashes' => [['phone' => '0812-3456-7890']],
            'phone 628' => [['phone' => '6281234567890']],
            'phone omitted' => [['phone' => '__unset']],
            'phone empty' => [['phone' => '']],
            'belum kawin without spouse' => [['marital_status' => 'BELUM_KAWIN', 'spouse_name' => '__unset']],
            'cerai without spouse' => [['marital_status' => 'CERAI', 'spouse_name' => null]],
            'kawin spouse forgotten' => [['spouse_name' => '__unset', 'spouse_forgotten' => true]],
            'kawin spouse omitted' => [['spouse_name' => '__unset']],
            'loan minimum' => [['loan_amount' => 5000000]],
            'loan maximum' => [['loan_amount' => 500000000]],
            'loan type kpr' => [['loan_type' => 'KPR']],
            'tenor 60' => [['loan_tenor_months' => 60]],
        ];
    }

    public static function invalid(): array
    {
        return [
            'name missing' => ['full_name', ['full_name' => '__unset']],
            'name too short' => ['full_name', ['full_name' => 'Bu']],
            'name too long' => ['full_name', ['full_name' => str_repeat('a', 101)]],
            'name with digits' => ['full_name', ['full_name' => 'Budi123']],
            'nik 15 digits' => ['nik', ['nik' => '317101150490000']],
            'nik with letters' => ['nik', ['nik' => '31710115049000AB']],
            'dob tomorrow' => ['dob', ['dob' => '2026-11-02']],
            'dob impossible date' => ['dob', ['dob' => '2026-02-30']],
            'dob wrong format' => ['dob', ['dob' => '15-04-1990']],
            'phone too short' => ['phone', ['phone' => '0812']],
            'phone too long' => ['phone', ['phone' => '62812345678901234']],
            'phone foreign' => ['phone', ['phone' => '+1 555 123 4567']],
            'marital unknown' => ['marital_status', ['marital_status' => 'MENIKAH']],
            'spouse when belum kawin' => ['spouse_name', ['marital_status' => 'BELUM_KAWIN']],
            'spouse when forgotten' => ['spouse_name', ['spouse_forgotten' => true]],
            'spouse with digits' => ['spouse_name', ['spouse_name' => 'Siti 2']],
            'spouse forgotten not boolean' => ['spouse_forgotten', ['spouse_name' => '__unset', 'spouse_forgotten' => 'maybe']],
            'loan type unknown' => ['loan_type', ['loan_type' => 'KPRS']],
            'loan below minimum' => ['loan_amount', ['loan_amount' => 4999999]],
            'loan above maximum' => ['loan_amount', ['loan_amount' => 500000001]],
            'loan decimal' => ['loan_amount', ['loan_amount' => 5000000.5]],
            'tenor not allowed' => ['loan_tenor_months', ['loan_tenor_months' => 18]],
        ];
    }

    #[DataProvider('valid')]
    public function test_valid(array $overrides): void
    {
        $this->postJson('/api/cif/check', $this->payload($overrides))->assertCreated();
    }

    #[DataProvider('invalid')]
    public function test_invalid(string $field, array $overrides): void
    {
        $this->postJson('/api/cif/check', $this->payload($overrides))
            ->assertUnprocessable()
            ->assertJsonValidationErrors([$field]);
    }

    public function test_messages_are_indonesian(): void
    {
        $this->postJson('/api/cif/check', [])
            ->assertUnprocessable()
            ->assertJsonPath('errors.full_name.0', 'Nama lengkap wajib diisi.')
            ->assertJsonPath('errors.nik.0', 'NIK wajib diisi.');
    }
}
