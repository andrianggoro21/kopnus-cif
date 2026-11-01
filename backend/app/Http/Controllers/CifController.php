<?php

namespace App\Http\Controllers;

use App\Http\Requests\CifCheckRequest;
use App\Http\Resources\ApplicationResource;
use App\Models\Application;
use App\Services\CifCheckService;
use Illuminate\Http\Request;

class CifController extends Controller
{
    public function check(CifCheckRequest $request, CifCheckService $service): ApplicationResource
    {
        return new ApplicationResource($service->check($request->validated()));
    }

    public function show(Request $request, string $applicationId): ApplicationResource
    {
        $token = $request->header('X-Application-Token') ?: abort(401, 'Header X-Application-Token wajib diisi.');
        $application = Application::findByToken($applicationId, $token) ?? abort(404, 'Pengajuan tidak ditemukan.');

        return new ApplicationResource($application->load('documents'));
    }
}
