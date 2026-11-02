<?php

namespace App\Services;

use App\Matching\Decision;
use App\Models\Application;
use App\Models\Document;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class DocumentService
{
    public function store(Application $app, UploadedFile $file, string $docType): Document
    {
        return DB::transaction(function () use ($app, $file, $docType) {
            $app = Application::lockForUpdate()->findOrFail($app->id);
            if ($app->decision === Decision::NotPass || $app->status === 'IN_REVIEW') {
                abort(409, 'Pengajuan ini tidak menerima dokumen.');
            }
            if ($app->documents()->count() >= 5) {
                throw ValidationException::withMessages(['file' => 'Maksimal 5 file per pengajuan.']);
            }

            return $app->documents()->create([
                'file_name' => mb_substr($file->getClientOriginalName(), 0, 255),
                'doc_type' => $docType,
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
                'path' => Storage::disk('local')->putFile("uploads/{$app->application_id}", $file),
                'status' => 'COMPLETED',
            ]);
        });
    }
}
