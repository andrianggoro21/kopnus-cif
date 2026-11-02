<?php

namespace App\Services;

use App\Clients\CustomerInformationClient;
use App\Clients\ScoringClient;
use App\Matching\Applicant;
use App\Matching\CandidateSelector;
use App\Matching\ConfidenceCalculator;
use App\Matching\Customer;
use App\Matching\Decision;
use App\Matching\DecisionEngine;
use App\Models\Application;

class CifCheckService
{
    public function __construct(
        private CustomerInformationClient $customers,
        private ScoringClient $scoring,
        private ApplicationIdGenerator $ids,
    ) {}

    public function check(array $validated): Application
    {
        $customers = $this->customers->all();
        $applicationId = $this->ids->next();

        $applicant = Applicant::fromInput($validated);
        $candidates = CandidateSelector::select($applicant, $customers);
        [$best, $confidence] = ConfidenceCalculator::best($applicant, $candidates) ?? [null, null];
        $score = $best ? $this->scoring->score($best->noCif, $applicationId, $applicant->nik, $confidence->value) : null;
        $result = DecisionEngine::decide($best, $confidence?->value, $score?->score);

        $token = bin2hex(random_bytes(32));

        $application = Application::create([
            'application_id' => $applicationId,
            'access_token_hash' => hash('sha256', $token),
            'full_name' => $validated['full_name'],
            'nik' => $validated['nik'],
            'dob' => $validated['dob'],
            'phone' => $validated['phone'] ?? null,
            'marital_status' => $validated['marital_status'],
            'spouse_name' => $validated['spouse_name'] ?? null,
            'spouse_forgotten' => $validated['spouse_forgotten'] ?? false,
            'loan_type' => $validated['loan_type'],
            'loan_amount' => $validated['loan_amount'],
            'loan_tenor_months' => $validated['loan_tenor_months'],
            'decision' => $result->decision,
            'reason' => $result->reason,
            'identity_confidence' => $confidence?->value,
            'credit_score' => $score?->score,
            'scoring_error' => $score?->error,
            'matched_no_cif' => $best?->noCif,
            'candidates' => array_map(function (Customer $c) use ($applicant) {
                $candidate = ConfidenceCalculator::calculate($applicant, $c);

                return ['no_cif' => $c->noCif, 'confidence' => $candidate->value, 'scores' => $candidate->scores];
            }, $candidates),
            'status' => $result->decision === Decision::Refer ? 'WAITING_DOCUMENTS' : 'COMPLETED',
        ]);
        $application->setAttribute('access_token', $token);

        return $application;
    }
}
