<?php

namespace App\Http\Controllers;

use App\Events\ApplicationSubmittedForReview;
use App\Http\Requests\CifCheckRequest;
use App\Http\Resources\ApplicationResource;
use App\Matching\Decision;
use App\Models\Application;
use App\Services\CifCheckService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CifController extends Controller
{
    public function check(CifCheckRequest $request, CifCheckService $service): ApplicationResource
    {
        return new ApplicationResource($service->check($request->validated()));
    }

    public function show(Request $request, string $applicationId): ApplicationResource
    {
        return new ApplicationResource($this->resolve($request, $applicationId)->load('documents'));
    }

    public function submit(Request $request, string $applicationId): ApplicationResource
    {
        $id = $this->resolve($request, $applicationId)->id;

        $application = DB::transaction(function () use ($id) {
            $application = Application::lockForUpdate()->findOrFail($id);
            if ($application->decision !== Decision::Refer || $application->status !== 'WAITING_DOCUMENTS') {
                abort(409, 'Pengajuan ini tidak dapat dikirim ke analis.');
            }
            if (! $application->documents()->exists()) {
                abort(422, 'Unggah minimal satu dokumen sebelum mengirim.');
            }
            $application->update(['status' => 'IN_REVIEW']);

            return $application;
        });

        event(new ApplicationSubmittedForReview($application->application_id));

        return new ApplicationResource($application->load('documents'));
    }

    private function resolve(Request $request, string $applicationId): Application
    {
        $token = $request->header('X-Application-Token') ?: abort(401, 'Header X-Application-Token wajib diisi.');

        return Application::findByToken($applicationId, $token) ?? abort(404, 'Pengajuan tidak ditemukan.');
    }
}
