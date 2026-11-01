<?php

namespace App\Matching;

enum Reason: string
{
    case CifNotFound = 'CIF_NOT_FOUND';
    case CifFlagged = 'CIF_FLAGGED';
    case LowConfidence = 'LOW_CONFIDENCE';
    case LowScore = 'LOW_SCORE';
}
