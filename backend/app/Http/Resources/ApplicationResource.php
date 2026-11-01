<?php

namespace App\Http\Resources;

use App\Matching\Decision;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ApplicationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'application_id' => $this->application_id,
            'access_token' => $this->whenHas('access_token'),
            'decision' => $this->decision->value,
            'identity_confidence' => $this->identity_confidence,
            'credit_score' => $this->credit_score,
            'status' => $this->status,
            'documents_required' => $this->decision === Decision::Refer,
            'loan' => [
                'type' => $this->loan_type,
                'amount' => $this->loan_amount,
                'tenor_months' => $this->loan_tenor_months,
            ],
            'documents' => DocumentResource::collection($this->documents),
            'created_at' => $this->created_at->setTimezone('Asia/Jakarta')->toIso8601String(),
        ];
    }
}
