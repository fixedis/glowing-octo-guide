<?php

declare(strict_types=1);

// src/CoreEngine/Contracts/RegistrableEngineInterface.php

namespace Project\CoreEngine\Contracts;

use Project\CoreEngine\Core\CoreServices;
use Project\CoreEngine\Core\EngineRegistration;

interface RegistrableEngineInterface extends EngineInterface
{
    public function register(
        EngineRegistration $registration,
        CoreServices $services
    ): void;
}
