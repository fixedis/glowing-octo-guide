<?php

declare(strict_types=1);

// src/CoreEngine/Core/EntityRegistry.php

namespace Project\CoreEngine\Core;

use LogicException;
use Project\CoreEngine\Contracts\LoggerInterface;
use RuntimeException;

final class EntityRegistry
{
    /**
     * @var array<string, list<string>>
     */
    private array $entitiesByEngine = [];

    public function __construct(
        private readonly LoggerInterface $logger
    ) {
    }

    /**
     * @param list<string> $entityClasses
     */
    public function registerClasses(string $engineId, array $entityClasses): void
    {
        foreach ($entityClasses as $entityClass) {
            $this->registerClass($engineId, $entityClass);
        }
    }

    public function registerClass(string $engineId, string $entityClass): void
    {
        $engineId = trim($engineId);
        $entityClass = trim($entityClass);

        if ($engineId === '') {
            throw new RuntimeException('Engine id cannot be empty while registering entity.');
        }

        if ($entityClass === '') {
            throw new RuntimeException(sprintf(
                'Entity class cannot be empty while registering entity for engine "%s".',
                $engineId
            ));
        }

        if (!class_exists($entityClass)) {
            $this->logger->error('Entity class does not exist.', [
                'engine_id' => $engineId,
                'entity_class' => $entityClass,
            ]);

            throw new RuntimeException(sprintf(
                'Entity class "%s" does not exist for engine "%s".',
                $entityClass,
                $engineId
            ));
        }

        $engineEntities = $this->entitiesByEngine[$engineId] ?? [];

        if (in_array($entityClass, $engineEntities, true)) {
            $this->logger->error('Entity class is already registered for engine.', [
                'engine_id' => $engineId,
                'entity_class' => $entityClass,
            ]);

            throw new LogicException(sprintf(
                'Entity class "%s" is already registered for engine "%s".',
                $entityClass,
                $engineId
            ));
        }

        $this->entitiesByEngine[$engineId][] = $entityClass;

        $this->logger->info('Entity class registered.', [
            'engine_id' => $engineId,
            'entity_class' => $entityClass,
        ]);
    }

    public function hasEngine(string $engineId): bool
    {
        return isset($this->entitiesByEngine[trim($engineId)]);
    }

    /**
     * @return list<string>
     */
    public function classesForEngine(string $engineId): array
    {
        return $this->entitiesByEngine[trim($engineId)] ?? [];
    }

    /**
     * @return array<string, list<string>>
     */
    public function all(): array
    {
        return $this->entitiesByEngine;
    }
}
