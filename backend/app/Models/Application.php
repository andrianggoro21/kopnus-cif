<?php

namespace App\Models;

use App\Matching\Decision;
use App\Matching\Reason;
use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Guarded(['id'])]
#[Hidden(['access_token_hash'])]
class Application extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'decision' => Decision::class,
            'reason' => Reason::class,
            'candidates' => 'array',
            'spouse_forgotten' => 'boolean',
            'identity_confidence' => 'float',
            'credit_score' => 'float',
            'loan_amount' => 'integer',
            'loan_tenor_months' => 'integer',
        ];
    }

    public static function findByToken(string $applicationId, string $token): ?self
    {
        $application = static::where('application_id', $applicationId)->first();

        return $application && hash_equals($application->access_token_hash, hash('sha256', $token)) ? $application : null;
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class, 'application_id', 'application_id');
    }
}
