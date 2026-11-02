<?php

namespace App\Http\Controllers;

use App\Http\Requests\UploadRequest;
use App\Http\Resources\DocumentResource;
use App\Models\Document;
use App\Services\DocumentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UploadController extends Controller
{
    public function store(UploadRequest $request, DocumentService $service): DocumentResource
    {
        return new DocumentResource($service->store($request->attributes->get('application'), $request->file('file'), $request->validated('doc_type')));
    }

    public function show(Request $request, string $uploadId): StreamedResponse
    {
        $document = Document::find($uploadId) ?? abort(404, 'Dokumen tidak ditemukan.');
        if ($document->application_id !== $request->attributes->get('application')->application_id) {
            abort(403, 'Dokumen bukan milik pengajuan ini.');
        }

        return Storage::disk('local')->response($document->path, $document->file_name, [
            'Content-Type' => $document->mime_type,
            'X-Content-Type-Options' => 'nosniff',
        ], 'inline');
    }
}
