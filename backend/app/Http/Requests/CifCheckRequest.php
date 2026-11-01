<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CifCheckRequest extends FormRequest
{
    private const NAME_PATTERN = "/^[\pL\s.,'\-]+$/u";

    protected function prepareForValidation(): void
    {
        $this->merge(array_filter([
            'nik' => is_string($this->nik) ? str_replace(' ', '', $this->nik) : null,
            'phone' => is_string($this->phone) ? str_replace([' ', '-'], '', $this->phone) : null,
        ], fn ($v) => $v !== null));
    }

    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'between:3,100', 'regex:'.self::NAME_PATTERN],
            'nik' => ['required', 'digits:16'],
            'dob' => ['required', 'date_format:Y-m-d', 'before_or_equal:'.now('Asia/Jakarta')->toDateString()],
            'phone' => ['nullable', 'string', 'regex:/^(08|628|\+628)\d{8,11}$/'],
            'marital_status' => ['required', 'in:BELUM_KAWIN,KAWIN,CERAI'],
            'spouse_forgotten' => ['sometimes', 'boolean'],
            'spouse_name' => [
                'nullable',
                'prohibited_unless:marital_status,KAWIN',
                'prohibited_if:spouse_forgotten,true',
                'string',
                'between:3,100',
                'regex:'.self::NAME_PATTERN,
            ],
            'loan_type' => ['required', 'in:KTA,KPR,KKB,MODAL_KERJA'],
            'loan_amount' => ['required', 'integer', 'between:5000000,500000000'],
            'loan_tenor_months' => ['required', 'integer', 'in:6,12,24,36,48,60'],
        ];
    }

    public function attributes(): array
    {
        return [
            'full_name' => 'Nama lengkap',
            'nik' => 'NIK',
            'dob' => 'Tanggal lahir',
            'phone' => 'Nomor HP',
            'marital_status' => 'Status perkawinan',
            'spouse_name' => 'Nama pasangan',
            'spouse_forgotten' => 'Lupa nama pasangan',
            'loan_type' => 'Jenis pinjaman',
            'loan_amount' => 'Jumlah pinjaman',
            'loan_tenor_months' => 'Tenor',
        ];
    }

    public function messages(): array
    {
        return [
            'required' => ':attribute wajib diisi.',
            'string' => ':attribute harus berupa teks.',
            'between' => ':attribute harus :min–:max karakter.',
            'regex' => ':attribute hanya boleh berisi huruf, spasi, titik, koma, apostrof, dan tanda hubung.',
            'in' => ':attribute tidak valid.',
            'integer' => ':attribute harus bilangan bulat.',
            'boolean' => ':attribute tidak valid.',
            'nik.digits' => 'NIK harus 16 digit angka.',
            'dob.date_format' => 'Tanggal lahir harus tanggal valid (YYYY-MM-DD).',
            'dob.before_or_equal' => 'Tanggal lahir tidak boleh di masa depan.',
            'phone.regex' => 'Nomor HP harus diawali 08, 628, atau +628 dan berisi 10–14 digit.',
            'spouse_name.prohibited_unless' => 'Nama pasangan hanya diisi bila status KAWIN.',
            'spouse_name.prohibited_if' => 'Kosongkan nama pasangan bila memilih lupa nama pasangan.',
            'loan_amount.between' => 'Jumlah pinjaman harus Rp5.000.000–Rp500.000.000.',
            'loan_tenor_months.in' => 'Tenor harus 6, 12, 24, 36, 48, atau 60 bulan.',
        ];
    }
}
