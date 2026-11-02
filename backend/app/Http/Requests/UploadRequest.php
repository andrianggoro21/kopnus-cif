<?php

namespace App\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

class UploadRequest extends FormRequest
{
    private const FILE_TYPES = 'File harus JPG, PNG, atau PDF.';

    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'max:20480',
                'extensions:jpg,jpeg,png,pdf',
                'mimes:jpg,jpeg,png,pdf',
                function (string $attribute, mixed $value, Closure $fail) {
                    if ($value instanceof UploadedFile && ! in_array($value->getClientMimeType(), ['image/jpeg', 'image/png', 'application/pdf'], true)) {
                        $fail(self::FILE_TYPES);
                    }
                },
            ],
            'doc_type' => ['required', 'in:KTP,NPWP,SLIP_GAJI,BUKU_NIKAH,LAINNYA'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'File wajib dipilih.',
            'file.file' => 'Unggahan file gagal.',
            'file.max' => 'Ukuran file maksimal 20 MB.',
            'file.extensions' => self::FILE_TYPES,
            'file.mimes' => self::FILE_TYPES,
            'doc_type.required' => 'Jenis dokumen wajib dipilih.',
            'doc_type.in' => 'Jenis dokumen tidak valid.',
        ];
    }
}
