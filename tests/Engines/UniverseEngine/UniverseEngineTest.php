<?php

declare(strict_types=1);

// tests/Engines/UniverseEngine/UniverseEngineTest.php

namespace Project\Tests\Engines\UniverseEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Contracts\EventHandlerInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CoreEngineBootstrap;
use Project\CoreEngine\Core\CoreEngineRuntime;
use Project\CoreEngine\Core\Event;
use Project\CoreEngine\Core\Logging\NullLogger;
use Project\Engines\UniverseEngine\Entities\Buildings\Building;
use Project\Engines\UniverseEngine\Entities\Galaxies\Galaxy;

final class UniverseEngineTest extends TestCase
{
    private function enginesPath(): string
    {
        return dirname(__DIR__, 3) . '/src/Engines';
    }

    private function createRuntime(): CoreEngineRuntime
    {
        return (new CoreEngineBootstrap(new NullLogger()))
            ->createRuntime($this->enginesPath(), 'universe-test-seed');
    }

    public function testBootstrapLoadsUniverseEngineAndEntities(): void
    {
        $runtime = $this->createRuntime();

        self::assertTrue($runtime->services->engineRegistry->has('universe-engine'));

        $entities = $runtime->services->entityRegistry->classesForEngine('universe-engine');

        self::assertContains(Galaxy::class, $entities);
        self::assertContains(Building::class, $entities);
    }

    public function testGenerateGalaxyChunkCommandPublishesEvent(): void
    {
        $services = $this->createRuntime()->services;

        $collector = $this->collector();
        $services->eventBus->subscribe('GalaxyChunkGenerated', $collector);

        $result = $services->commandBus->dispatch(new Command(
            'cmd_universe_1',
            'GenerateGalaxyChunk',
            [
                'universeSeed' => 1337,
                'chunkX' => 0,
                'chunkY' => 0,
                'chunkZ' => 0,
            ]
        ), $services->state);

        self::assertTrue($result->success);
        self::assertCount(1, $collector->events);
        self::assertIsArray($collector->events[0]->payload['galaxies']);
    }

    public function testGenerateStarSystemsCommandPublishesEvent(): void
    {
        $services = $this->createRuntime()->services;

        $collector = $this->collector();
        $services->eventBus->subscribe('StarSystemsGenerated', $collector);

        $result = $services->commandBus->dispatch(new Command(
            'cmd_universe_2',
            'GenerateStarSystems',
            [
                'galaxySeed' => 666013,
                'galaxyRadius' => 60,
            ]
        ), $services->state);

        self::assertTrue($result->success);
        self::assertNotEmpty($collector->events[0]->payload['systems']);
        self::assertIsArray($collector->events[0]->payload['routes']);
    }

    public function testGeneratePlanetsCommandPublishesEvent(): void
    {
        $services = $this->createRuntime()->services;

        $collector = $this->collector();
        $services->eventBus->subscribe('PlanetsGenerated', $collector);

        $result = $services->commandBus->dispatch(new Command(
            'cmd_universe_3',
            'GeneratePlanets',
            [
                'systemSeed' => 1234,
                'planetCount' => 6,
            ]
        ), $services->state);

        self::assertTrue($result->success);
        self::assertCount(6, $collector->events[0]->payload['planets']);
    }

    public function testGenerateColonyAreaCommandPublishesEvent(): void
    {
        $services = $this->createRuntime()->services;

        $collector = $this->collector();
        $services->eventBus->subscribe('ColonyAreaGenerated', $collector);

        $result = $services->commandBus->dispatch(new Command(
            'cmd_universe_4',
            'GenerateColonyArea',
            [
                'planetSeed' => 1337,
                'face' => 0,
                'depth' => 2,
                'x' => 0,
                'y' => 0,
                'size' => 4,
            ]
        ), $services->state);

        self::assertTrue($result->success);

        $buildings = $collector->events[0]->payload['buildings'];

        self::assertIsArray($buildings);

        foreach ($buildings as $building) {
            self::assertContains($building['type'], Building::TYPES);
            self::assertGreaterThanOrEqual(0, $building['x']);
            self::assertLessThanOrEqual(3, $building['x']);
            self::assertGreaterThanOrEqual(0, $building['y']);
            self::assertLessThanOrEqual(3, $building['y']);
        }
    }

    public function testPlaceBuildingThenAreaContainsIt(): void
    {
        $services = $this->createRuntime()->services;

        $place = $services->commandBus->dispatch(new Command(
            'cmd_universe_5',
            'PlaceBuilding',
            [
                'planetSeed' => 1337,
                'face' => 0,
                'depth' => 2,
                'x' => 1,
                'y' => 1,
                'type' => Building::TYPE_TOWER,
            ]
        ), $services->state);

        self::assertTrue($place->success);

        $collector = $this->collector();
        $services->eventBus->subscribe('ColonyAreaGenerated', $collector);

        $services->commandBus->dispatch(new Command(
            'cmd_universe_6',
            'GenerateColonyArea',
            [
                'planetSeed' => 1337,
                'face' => 0,
                'depth' => 2,
                'x' => 0,
                'y' => 0,
                'size' => 4,
            ]
        ), $services->state);

        $buildings = $collector->events[0]->payload['buildings'];

        $found = null;

        foreach ($buildings as $building) {
            if ($building['x'] === 1 && $building['y'] === 1) {
                $found = $building;
            }
        }

        self::assertNotNull($found);
        self::assertSame(Building::TYPE_TOWER, $found['type']);
    }

    public function testPlaceBuildingRejectsInvalidType(): void
    {
        $services = $this->createRuntime()->services;

        $result = $services->commandBus->dispatch(new Command(
            'cmd_universe_7',
            'PlaceBuilding',
            [
                'planetSeed' => 1337,
                'face' => 0,
                'depth' => 2,
                'x' => 1,
                'y' => 1,
                'type' => 'castle',
            ]
        ), $services->state);

        self::assertFalse($result->success);
    }

    public function testDemolishRemovesPlacedBuilding(): void
    {
        $services = $this->createRuntime()->services;

        $services->commandBus->dispatch(new Command(
            'cmd_universe_8',
            'PlaceBuilding',
            [
                'planetSeed' => 1337,
                'face' => 0,
                'depth' => 2,
                'x' => 2,
                'y' => 2,
                'type' => Building::TYPE_DOME,
            ]
        ), $services->state);

        $demolish = $services->commandBus->dispatch(new Command(
            'cmd_universe_9',
            'DemolishBuilding',
            [
                'planetSeed' => 1337,
                'face' => 0,
                'depth' => 2,
                'x' => 2,
                'y' => 2,
            ]
        ), $services->state);

        self::assertTrue($demolish->success);

        $collector = $this->collector();
        $services->eventBus->subscribe('ColonyAreaGenerated', $collector);

        $services->commandBus->dispatch(new Command(
            'cmd_universe_10',
            'GenerateColonyArea',
            [
                'planetSeed' => 1337,
                'face' => 0,
                'depth' => 2,
                'x' => 0,
                'y' => 0,
                'size' => 4,
            ]
        ), $services->state);

        foreach ($collector->events[0]->payload['buildings'] as $building) {
            self::assertFalse($building['x'] === 2 && $building['y'] === 2);
        }
    }

    public function testGenerateGalaxyChunkCommandRejectsInvalidPayload(): void
    {
        $services = $this->createRuntime()->services;

        $result = $services->commandBus->dispatch(new Command(
            'cmd_universe_bad',
            'GenerateGalaxyChunk',
            [
                'universeSeed' => 1337,
                'chunkX' => 0,
                'chunkY' => 0,
            ]
        ), $services->state);

        self::assertFalse($result->success);
    }

    /**
     * @return EventHandlerInterface&object{events: list<Event>}
     */
    private function collector(): EventHandlerInterface
    {
        return new class implements EventHandlerInterface {
            /**
             * @var list<Event>
             */
            public array $events = [];

            public function handle(Event $event): void
            {
                $this->events[] = $event;
            }
        };
    }
}
