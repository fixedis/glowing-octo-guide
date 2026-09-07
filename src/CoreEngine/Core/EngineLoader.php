<?php

declare(strict_types=1);

// src/CoreEngine/Core/EngineLoader.php

namespace Project\CoreEngine\Core;

use Project\CoreEngine\Contracts\EngineInterface;
use Project\CoreEngine\Contracts\RegistrableEngineInterface;

final class EngineLoader
{
    public function __construct(
        private readonly ManifestLoader $manifestLoader,
        private readonly EngineFactory $engineFactory,
        private readonly CoreServices $coreServices,
        private readonly EngineDependencyResolver $dependencyResolver,
        private readonly EntityDiscovery $entityDiscovery
    ) {
    }

    /**
     * @return array<string, EngineInterface>
     */
    public function loadFromDirectory(string $enginesPath): array
    {
        $logger = $this->coreServices->logger;

        $logger->info('Engine loading started.', [
            'engines_path' => $enginesPath,
        ]);

        $manifests = $this->manifestLoader->loadFromEnginesDirectory($enginesPath);

        $orderedManifests = $this->dependencyResolver->resolve($manifests);

        $engines = [];

        foreach ($orderedManifests as $manifest) {
            $engine = $this->loadManifest($manifest);
            $engines[$engine->id()] = $engine;
        }

        $logger->info('Engine loading completed.', [
            'engines_path' => $enginesPath,
            'engines_count' => count($engines),
        ]);

        return $engines;
    }

    public function loadManifest(EngineManifest $manifest): EngineInterface
    {
        $logger = $this->coreServices->logger;

        $logger->debug('Loading engine from manifest.', [
            'engine_id' => $manifest->id,
            'engine_class' => $manifest->engineClass,
        ]);

        $engine = $this->engineFactory->create($manifest);

        $entityClasses = $this->entityDiscovery->discover($manifest);

        if ($entityClasses !== []) {
            $this->coreServices->entityRegistry->registerClasses(
                $engine->id(),
                $entityClasses
            );
        }

        if ($engine instanceof RegistrableEngineInterface) {
            $logger->debug('Engine supports registration. Creating engine registration.', [
                'engine_id' => $engine->id(),
                'engine_class' => $engine::class,
            ]);

            $registration = new EngineRegistration(
                $engine->id(),
                $this->coreServices->commandBus,
                $this->coreServices->eventBus,
                $this->coreServices->systemPipeline,
                $this->coreServices->logger
            );

            $engine->register($registration, $this->coreServices);
        }

        $this->coreServices->engineRegistry->register($engine);

        $logger->info('Engine loaded and registered.', [
            'engine_id' => $engine->id(),
            'engine_version' => $engine->version(),
        ]);

        return $engine;
    }
}
