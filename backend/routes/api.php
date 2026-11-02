<?php

use App\Http\Controllers\CifController;
use Illuminate\Support\Facades\Route;

Route::post('/cif/check', [CifController::class, 'check'])->middleware('throttle:cif-check');
Route::get('/cif/{applicationId}', [CifController::class, 'show']);
Route::post('/cif/{applicationId}/submit', [CifController::class, 'submit']);
