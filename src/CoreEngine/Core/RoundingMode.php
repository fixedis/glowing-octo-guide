<?php

declare(strict_types=1);

// src/CoreEngine/Core/RoundingMode.php

namespace Project\CoreEngine\Core;

enum RoundingMode: string
{
    case HalfUp = 'half_up';
    case HalfDown = 'half_down';
    case Floor = 'floor';
    case Ceiling = 'ceiling';
    case TowardsZero = 'towards_zero';
}
