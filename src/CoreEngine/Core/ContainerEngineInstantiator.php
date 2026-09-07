<?php

declare(strict_types=1);

// src/CoreEngine/Core/ContainerEngineInstantiator.php

namespace Project\CoreEngine\Core;

use Project\CoreEngine\Contracts\ContainerInterface;
use Project\CoreEngine\Contracts\EngineInstantiatorInterface;
use Project\CoreEngine\Contracts\EngineInterface;
use Project\CoreEngine\Contracts\LoggerInterface;
use RuntimeException;
use Throwable;

final class ContainerEngineInstantiator implements EngineInstantiatorInterface
{
    public function __construct(
        private readonly ContainerInterface $container,
        private readonly LoggerInterface $logger
    ) {
    }

    public function instantiate(string $engineClass): EngineInterface
    {
        $this->logger->debug('Instantiating engine through container.', [
            'engine_class' => $engineClass,
        ]);

        try {
            $engine = $this->container->get($engineClass);
        } catch (Throwable $exception) {
            $this->logger->error('Container failed to instantiate engine.', [
                'engine_class' => $engineClass,
                'error' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
            ]);

            throw new RuntimeException(sprintf(
                'Container failed to instantiate engine class "%s": %s',
                $engineClass,
                $exception->getMessage()
            ), 0, $exception);
        }

        if (!$engine instanceof EngineInterface) {
            $this->logger->error('Container returned invalid engine instance.', [
                'engine_class' => $engineClass,
                'actual_class' => get_class($engine),
            ]);

            throw new RuntimeException(sprintf(
                'Container returned instance of "%s" which does not implement EngineInterface.',
                get_class($engine)
            ));
        }

        $this->logger->info('Engine instantiated through container.', [
            'engine_class' => $engineClass,
            'engine_id' => $engine->id(),
            'engine_version' => $engine->version(),
        ]);

        return $engine;
    }
}
