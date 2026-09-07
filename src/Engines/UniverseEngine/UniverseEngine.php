<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/UniverseEngine.php

namespace Project\Engines\UniverseEngine;

use Project\CoreEngine\Contracts\RegistrableEngineInterface;
use Project\CoreEngine\Core\CoreServices;
use Project\CoreEngine\Core\EngineRegistration;
use Project\Engines\UniverseEngine\Contracts\BuildingDeltaStoreInterface;
use Project\Engines\UniverseEngine\Core\Colony\ColonyGenerator;
use Project\Engines\UniverseEngine\Core\Colony\ColonyResolver;
use Project\Engines\UniverseEngine\Core\Colony\FileBuildingDeltaStore;
use Project\Engines\UniverseEngine\Core\Colony\InMemoryBuildingDeltaStore;
use Project\Engines\UniverseEngine\Core\Commands\DemolishBuildingHandler;
use Project\Engines\UniverseEngine\Core\Commands\GenerateColonyAreaHandler;
use Project\Engines\UniverseEngine\Core\Commands\GenerateGalaxyChunkHandler;
use Project\Engines\UniverseEngine\Core\Commands\GeneratePlanetsHandler;
use Project\Engines\UniverseEngine\Core\Commands\GenerateStarSystemsHandler;
use Project\Engines\UniverseEngine\Core\Commands\PlaceBuildingHandler;
use Project\Engines\UniverseEngine\Core\Commands\SpawnPlanetHandler;
use Project\Engines\UniverseEngine\Core\Commands\SpawnShipHandler;
use Project\Engines\UniverseEngine\Core\GalaxyGenerator;
use Project\Engines\UniverseEngine\Core\PlanetGenerator;
use Project\Engines\UniverseEngine\Core\RouteGenerator;
use Project\Engines\UniverseEngine\Core\SeedGraph;
use Project\Engines\UniverseEngine\Core\StarSystemGenerator;

final class UniverseEngine implements RegistrableEngineInterface
{
    public function __construct(
        private readonly ?BuildingDeltaStoreInterface $deltaStore = null
    ) {
    }

    public function id(): string
    {
        return 'universe-engine';
    }

    public function version(): string
    {
        return '0.4.0';
    }

    public function register(
        EngineRegistration $registration,
        CoreServices $services
    ): void {
        $seedGraph = new SeedGraph();
        $deltaStore = $this->resolveDeltaStore();

        $colonyResolver = new ColonyResolver(
            new ColonyGenerator($seedGraph),
            $deltaStore,
            $seedGraph
        );

        $registration->commandHandler(
            'GenerateGalaxyChunk',
            new GenerateGalaxyChunkHandler(new GalaxyGenerator($seedGraph))
        );

        $registration->commandHandler(
            'GenerateStarSystems',
            new GenerateStarSystemsHandler(
                new StarSystemGenerator($seedGraph),
                new RouteGenerator($seedGraph)
            )
        );

        $registration->commandHandler(
            'GeneratePlanets',
            new GeneratePlanetsHandler(new PlanetGenerator($seedGraph))
        );

        $registration->commandHandler(
            'GenerateColonyArea',
            new GenerateColonyAreaHandler($colonyResolver)
        );

        $registration->commandHandler(
            'PlaceBuilding',
            new PlaceBuildingHandler($colonyResolver, $deltaStore)
        );

        $registration->commandHandler(
            'DemolishBuilding',
            new DemolishBuildingHandler($deltaStore)
        );

        $registration->commandHandler(
            'SpawnPlanet',
            new SpawnPlanetHandler()
        );

        $registration->commandHandler(
            'SpawnShip',
            new SpawnShipHandler()
        );
    }

    private function resolveDeltaStore(): BuildingDeltaStoreInterface
    {
        if ($this->deltaStore !== null) {
            return $this->deltaStore;
        }

        $path = getenv('UNIVERSE_DELTA_PATH');

        if (is_string($path) && trim($path) !== '') {
            return new FileBuildingDeltaStore(trim($path));
        }

        return new InMemoryBuildingDeltaStore();
    }

    public function boot(): void
    {
        // Universe engine has no boot-time side effects.
    }

    public function shutdown(): void
    {
        // Universe engine has no shutdown-time side effects.
    }
}
