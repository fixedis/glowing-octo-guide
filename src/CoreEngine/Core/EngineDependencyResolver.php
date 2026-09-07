<?php

declare(strict_types=1);

// src/CoreEngine/Core/EngineDependencyResolver.php

namespace Project\CoreEngine\Core;

use LogicException;
use Project\CoreEngine\Contracts\LoggerInterface;
use RuntimeException;

final class EngineDependencyResolver
{
    public const CORE_PROVIDES = [
        'core.engine',
        'core.state',
        'core.events',
        'core.commands',
        'core.systems',
        'core.snapshot',
        'core.container',
        'core.logger',
    ];

    private const CORE_ID = '__core__';

    /**
     * @param list<string>|null $coreProvides
     */
    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly ?array $coreProvides = null
    ) {
    }

    /**
     * @param array<string, EngineManifest>|list<EngineManifest> $manifests
     *
     * @return list<EngineManifest>
     */
    public function resolve(array $manifests): array
    {
        $coreProvides = $this->coreProvides ?? self::CORE_PROVIDES;

        $manifestsById = $this->indexManifests($manifests);
        $providers = $this->buildProviders($manifestsById, $coreProvides);
        $dependencies = $this->buildDependencies($manifestsById, $providers);
        $orderedIds = $this->sortDependencies($manifestsById, $dependencies);

        $orderedManifests = [];

        foreach ($orderedIds as $engineId) {
            $orderedManifests[] = $manifestsById[$engineId];
        }

        $this->logger->info('Engine dependencies resolved.', [
            'engines_count' => count($orderedManifests),
            'load_order' => $orderedIds,
        ]);

        return $orderedManifests;
    }

    /**
     * @param array<string, EngineManifest>|list<EngineManifest> $manifests
     *
     * @return array<string, EngineManifest>
     */
    private function indexManifests(array $manifests): array
    {
        $manifestsById = [];

        foreach ($manifests as $manifest) {
            if (isset($manifestsById[$manifest->id])) {
                $this->logger->error('Duplicate engine manifest id found.', [
                    'engine_id' => $manifest->id,
                ]);

                throw new LogicException(sprintf(
                    'Duplicate engine manifest id "%s" found.',
                    $manifest->id
                ));
            }

            $manifestsById[$manifest->id] = $manifest;
        }

        ksort($manifestsById, SORT_STRING);

        return $manifestsById;
    }

    /**
     * @param array<string, EngineManifest> $manifestsById
     * @param list<string> $coreProvides
     *
     * @return array<string, string>
     */
    private function buildProviders(array $manifestsById, array $coreProvides): array
    {
        $providers = [];

        foreach ($coreProvides as $capability) {
            $capability = trim($capability);

            if ($capability === '') {
                continue;
            }

            $providers[$capability] = self::CORE_ID;
        }

        foreach ($manifestsById as $engineId => $manifest) {
            foreach ($manifest->provides as $capability) {
                $capability = trim($capability);

                if ($capability === '') {
                    $this->logger->error('Engine provides empty capability.', [
                        'engine_id' => $engineId,
                    ]);

                    throw new RuntimeException(sprintf(
                        'Engine "%s" provides empty capability.',
                        $engineId
                    ));
                }

                if (isset($providers[$capability])) {
                    $this->logger->error('Capability provider conflict.', [
                        'capability' => $capability,
                        'engine_id' => $engineId,
                        'already_provided_by' => $providers[$capability],
                    ]);

                    throw new RuntimeException(sprintf(
                        'Capability "%s" is already provided by "%s". Engine "%s" cannot provide it again.',
                        $capability,
                        $providers[$capability],
                        $engineId
                    ));
                }

                $providers[$capability] = $engineId;
            }
        }

        return $providers;
    }

    /**
     * @param array<string, EngineManifest> $manifestsById
     * @param array<string, string> $providers
     *
     * @return array<string, list<string>>
     */
    private function buildDependencies(array $manifestsById, array $providers): array
    {
        $dependencies = [];

        foreach ($manifestsById as $engineId => $manifest) {
            $engineDependencies = [];

            foreach ($manifest->requires as $capability) {
                $capability = trim($capability);

                if ($capability === '') {
                    $this->logger->error('Engine requires empty capability.', [
                        'engine_id' => $engineId,
                    ]);

                    throw new RuntimeException(sprintf(
                        'Engine "%s" requires empty capability.',
                        $engineId
                    ));
                }

                if (!isset($providers[$capability])) {
                    $this->logger->error('Engine dependency is not satisfied.', [
                        'engine_id' => $engineId,
                        'missing_capability' => $capability,
                    ]);

                    throw new RuntimeException(sprintf(
                        'Engine "%s" requires capability "%s", but it is not provided.',
                        $engineId,
                        $capability
                    ));
                }

                $providerId = $providers[$capability];

                if ($providerId !== self::CORE_ID && $providerId !== $engineId) {
                    $engineDependencies[$providerId] = $providerId;
                }
            }

            ksort($engineDependencies, SORT_STRING);

            $dependencies[$engineId] = array_values($engineDependencies);
        }

        return $dependencies;
    }

    /**
     * @param array<string, EngineManifest> $manifestsById
     * @param array<string, list<string>> $dependencies
     *
     * @return list<string>
     */
    private function sortDependencies(array $manifestsById, array $dependencies): array
    {
        $state = [];
        $orderedIds = [];

        foreach (array_keys($manifestsById) as $engineId) {
            $this->visitEngine($engineId, $dependencies, $manifestsById, $state, $orderedIds);
        }

        return $orderedIds;
    }

    /**
     * @param array<string, list<string>> $dependencies
     * @param array<string, EngineManifest> $manifestsById
     * @param array<string, int> $state
     * @param list<string> $orderedIds
     */
    private function visitEngine(
        string $engineId,
        array $dependencies,
        array $manifestsById,
        array &$state,
        array &$orderedIds
    ): void {
        $engineState = $state[$engineId] ?? 0;

        if ($engineState === 2) {
            return;
        }

        if ($engineState === 1) {
            $this->logger->error('Circular engine dependency detected.', [
                'engine_id' => $engineId,
            ]);

            throw new RuntimeException(sprintf(
                'Circular engine dependency detected involving engine "%s".',
                $engineId
            ));
        }

        $state[$engineId] = 1;

        foreach ($dependencies[$engineId] ?? [] as $dependencyId) {
            if (!isset($manifestsById[$dependencyId])) {
                $this->logger->error('Engine dependency target is missing.', [
                    'engine_id' => $engineId,
                    'dependency_id' => $dependencyId,
                ]);

                throw new RuntimeException(sprintf(
                    'Engine "%s" depends on engine "%s", but dependency manifest is missing.',
                    $engineId,
                    $dependencyId
                ));
            }

            $this->visitEngine($dependencyId, $dependencies, $manifestsById, $state, $orderedIds);
        }

        $state[$engineId] = 2;
        $orderedIds[] = $engineId;
    }
}
