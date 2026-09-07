<?php

declare(strict_types=1);

// src/CoreEngine/Core/CoreServices.php

namespace Project\CoreEngine\Core;

use Project\CoreEngine\Contracts\ContainerInterface;
use Project\CoreEngine\Contracts\DeterministicRandomInterface;
use Project\CoreEngine\Contracts\LoggerInterface;
use Project\CoreEngine\Contracts\MathKernelInterface;
use Project\CoreEngine\Contracts\StateInterface;

final class CoreServices
{
    public function __construct(
        public readonly StateInterface $state,
        public readonly EventBus $eventBus,
        public readonly CommandBus $commandBus,
        public readonly SystemPipeline $systemPipeline,
        public readonly EngineRegistry $engineRegistry,
        public readonly EntityRegistry $entityRegistry,
        public readonly ContainerInterface $container,
        public readonly MathKernelInterface $math,
        public readonly DeterministicRandomInterface $random,
        public readonly SnapshotManager $snapshots,
        public readonly Kernel $kernel,
        public readonly LoggerInterface $logger
    ) {
    }
}
