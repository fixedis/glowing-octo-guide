<?php

declare(strict_types=1);

// src/CoreEngine/Core/EngineFactory.php

namespace Project\CoreEngine\Core;

use Project\CoreEngine\Contracts\EngineInstantiatorInterface;
use Project\CoreEngine\Contracts\EngineInterface;
use Project\CoreEngine\Contracts\LoggerInterface;
use ReflectionClass;
use RuntimeException;
use Throwable;

final class EngineFactory
{
    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly ?EngineInstantiatorInterface $instantiator = null
    ) {
    }

    public function create(EngineManifest $manifest): EngineInterface
    {
        $engineClass = $manifest->engineClass;

        $this->logger->debug('Creating engine from manifest.', [
            'engine_id' => $manifest->id,
            'engine_class' => $engineClass,
            'manifest_version' => $manifest->version,
        ]);

        if (!class_exists($engineClass)) {
            $this->logger->error('Engine class not found.', [
                'engine_id' => $manifest->id,
                'engine_class' => $engineClass,
            ]);

            throw new RuntimeException(sprintf(
                'Engine class "%s" not found for engine "%s".',
                $engineClass,
                $manifest->id
            ));
        }

        $reflection = new ReflectionClass($engineClass);

        if (!$reflection->implementsInterface(EngineInterface::class)) {
            $this->logger->error('Engine class does not implement EngineInterface.', [
                'engine_id' => $manifest->id,
                'engine_class' => $engineClass,
            ]);

            throw new RuntimeException(sprintf(
                'Engine class "%s" must implement EngineInterface for engine "%s".',
                $engineClass,
                $manifest->id
            ));
        }

        try {
            if ($this->instantiator !== null) {
                $engine = $this->instantiator->instantiate($engineClass);
            } else {
                if (!$reflection->isInstantiable()) {
                    $this->logger->error('Engine class is not instantiable.', [
                        'engine_id' => $manifest->id,
                        'engine_class' => $engineClass,
                    ]);

                    throw new RuntimeException(sprintf(
                        'Engine class "%s" is not instantiable for engine "%s".',
                        $engineClass,
                        $manifest->id
                    ));
                }

                $engine = $reflection->newInstance();
            }
        } catch (Throwable $exception) {
            $this->logger->error('Engine instantiation failed.', [
                'engine_id' => $manifest->id,
                'engine_class' => $engineClass,
                'error' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
            ]);

            throw new RuntimeException(sprintf(
                'Engine "%s" could not be instantiated: %s',
                $manifest->id,
                $exception->getMessage()
            ), 0, $exception);
        }

        if (!$engine instanceof EngineInterface) {
            $this->logger->error('Engine factory returned invalid engine instance.', [
                'engine_id' => $manifest->id,
                'engine_class' => $engineClass,
            ]);

            throw new RuntimeException(sprintf(
                'Engine factory returned invalid instance for engine "%s".',
                $manifest->id
            ));
        }

        $this->logger->info('Engine instance created.', [
            'engine_id' => $manifest->id,
            'engine_class' => $engineClass,
            'engine_version' => $engine->version(),
        ]);

        return $engine;
    }
}
