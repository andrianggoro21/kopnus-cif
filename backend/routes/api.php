<?php

use App\Http\Controllers\CifController;
use App\Http\Controllers\UploadController;
use App\Http\Middleware\ResolveApplication;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => [
    'service' => 'CIF Customer Information Checking',
    'status' => 'ok',
    'endpoints' => [
        'POST /api/cif/check',
        'GET /api/cif/{application_id}',
        'POST /api/cif/{application_id}/submit',
        'POST /api/uploads',
        'GET /api/uploads/{upload_id}',
    ],
]);

Route::post('/cif/check', [CifController::class, 'check'])->middleware('throttle:cif-check');
Route::get('/cif/{applicationId}', [CifController::class, 'show']);
Route::post('/cif/{applicationId}/submit', [CifController::class, 'submit']);

Route::middleware(ResolveApplication::class)->group(function () {
    Route::post('/uploads', [UploadController::class, 'store']);
    Route::get('/uploads/{uploadId}', [UploadController::class, 'show'])->whereNumber('uploadId');
});
