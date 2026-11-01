<?php

namespace App\Matching;

enum Decision: string
{
    case Pass = 'PASS';
    case Refer = 'REFER';
    case NotPass = 'NOT_PASS';
}
