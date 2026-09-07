<?php

declare(strict_types=1);

// src/CoreEngine/Core/CoreEngineRuntime.php

namespace Project\CoreEngine\Core;

use Project\CoreEngine\Contracts\ContainerInterface;

final class CoreEngineRuntime
{
    public function __construct(
        public readonly CoreServices $services,
        public readonly Kernel $kernel,
        public readonly EngineLoader $engineLoader,
        public readonly ContainerInterface $container
    ) {
    }
}
