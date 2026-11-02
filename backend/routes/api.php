<?php

use App\Http\Controllers\CifController;
use App\Http\Controllers\UploadController;
use App\Http\Middleware\ResolveApplication;
use Illuminate\Support\Facades\Route;

Route::post('/cif/check', [CifController::class, 'check'])->middleware('throttle:cif-check');
Route::get('/cif/{applicationId}', [CifController::class, 'show']);
Route::post('/cif/{applicationId}/submit', [CifController::class, 'submit']);

Route::middleware(ResolveApplication::class)->group(function () {
    Route::post('/uploads', [UploadController::class, 'store']);
    Route::get('/uploads/{uploadId}', [UploadController::class, 'show'])->whereNumber('uploadId');
});
