<?php

declare(strict_types=1);

// src/CoreEngine/Core/EngineRegistry.php

namespace Project\CoreEngine\Core;

use InvalidArgumentException;
use LogicException;
use Project\CoreEngine\Contracts\EngineInterface;
use Project\CoreEngine\Contracts\LoggerInterface;
use RuntimeException;
use Throwable;

final class EngineRegistry
{
    /**
     * @var array<string, EngineInterface>
     */
    private array $engines = [];

    public function __construct(
        private readonly LoggerInterface $logger
    ) {
    }

    public function register(EngineInterface $engine): void
    {
        $engineId = $engine->id();

        if (isset($this->engines[$engineId])) {
            throw new LogicException(sprintf(
                'Engine with id "%s" is already registered.',
                $engineId
            ));
        }

        $this->engines[$engineId] = $engine;

        $this->logger->debug('Engine registered.', [
            'engine_id' => $engineId,
            'engine_version' => $engine->version(),
        ]);
    }

    public function get(string $engineId): EngineInterface
    {
        if (!isset($this->engines[$engineId])) {
            throw new InvalidArgumentException(sprintf(
                'Engine with id "%s" is not registered.',
                $engineId
            ));
        }

        return $this->engines[$engineId];
    }

    public function has(string $engineId): bool
    {
        return isset($this->engines[$engineId]);
    }

    /**
     * @return array<string, EngineInterface>
     */
    public function all(): array
    {
        return $this->engines;
    }

    public function bootAll(): void
    {
        foreach ($this->engines as $engine) {
            try {
                $engine->boot();

                $this->logger->info('Engine booted.', [
                    'engine_id' => $engine->id(),
                    'engine_version' => $engine->version(),
                ]);
            } catch (Throwable $exception) {
                $this->logger->error('Engine boot failed.', [
                    'engine_id' => $engine->id(),
                    'error' => $exception->getMessage(),
                    'file' => $exception->getFile(),
                    'line' => $exception->getLine(),
                ]);

                throw new RuntimeException(sprintf(
                    'Engine "%s" failed to boot: %s',
                    $engine->id(),
                    $exception->getMessage()
                ), 0, $exception);
            }
        }
    }

    public function shutdownAll(): void
    {
        foreach ($this->engines as $engine) {
            try {
                $engine->shutdown();

                $this->logger->info('Engine shutdown completed.', [
                    'engine_id' => $engine->id(),
                ]);
            } catch (Throwable $exception) {
                $this->logger->error('Engine shutdown failed.', [
                    'engine_id' => $engine->id(),
                    'error' => $exception->getMessage(),
                    'file' => $exception->getFile(),
                    'line' => $exception->getLine(),
                ]);
            }
        }
    }
}
