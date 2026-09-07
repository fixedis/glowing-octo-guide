<?php

declare(strict_types=1);

// tests/Engines/UniverseEngine/UniverseEnginePersistenceTest.php

namespace Project\Tests\Engines\UniverseEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Contracts\EventHandlerInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandBus;
use Project\CoreEngine\Core\Container;
use Project\CoreEngine\Core\CoreServices;
use Project\CoreEngine\Core\DeterministicRandom;
use Project\CoreEngine\Core\EngineRegistration;
use Project\CoreEngine\Core\EngineRegistry;
use Project\CoreEngine\Core\EntityRegistry;
use Project\CoreEngine\Core\Event;
use Project\CoreEngine\Core\EventBus;
use Project\CoreEngine\Core\InMemorySnapshotStore;
use Project\CoreEngine\Core\Kernel;
use Project\CoreEngine\Core\Logging\NullLogger;
use Project\CoreEngine\Core\MathKernel;
use Project\CoreEngine\Core\SnapshotManager;
use Project\CoreEngine\Core\State;
use Project\CoreEngine\Core\SystemPipeline;
use Project\Engines\UniverseEngine\Core\Colony\FileBuildingDeltaStore;
use Project\Engines\UniverseEngine\Entities\Buildings\Building;
use Project\Engines\UniverseEngine\UniverseEngine;

final class UniverseEnginePersistenceTest extends TestCase
{
    private string $storagePath;

    protected function setUp(): void
    {
        $this->storagePath = sys_get_temp_dir() . '/ue_persist_' . uniqid('', true);
    }

    protected function tearDown(): void
    {
        if (is_dir($this->storagePath)) {
            $items = scandir($this->storagePath) ?: [];

            foreach ($items as $item) {
                if ($item !== '.' && $item !== '..') {
                    unlink($this->storagePath . '/' . $item);
                }
            }

            rmdir($this->storagePath);
        }
    }

    private function createServices(): CoreServices
    {
        $logger = new NullLogger();
        $state = new State();
        $eventBus = new EventBus($logger);
        $commandBus = new CommandBus($eventBus, $logger);
        $systemPipeline = new SystemPipeline($logger);

        $kernel = new Kernel(
            $state,
            $commandBus,
            $eventBus,
            new EngineRegistry($logger),
            $systemPipeline,
            new DeterministicRandom($logger, 'persistence-test-seed'),
            new SnapshotManager(new InMemorySnapshotStore(), $logger),
            $logger
        );

        return new CoreServices(
            $state,
            $eventBus,
            $commandBus,
            $systemPipeline,
            new EngineRegistry($logger),
            new EntityRegistry($logger),
            new Container(),
            new MathKernel($logger),
            new DeterministicRandom($logger, 'persistence-test-seed'),
            new SnapshotManager(new InMemorySnapshotStore(), $logger),
            $kernel,
            $logger
        );
    }

    private function registerEngine(CoreServices $services): void
    {
        $engine = new UniverseEngine(new FileBuildingDeltaStore($this->storagePath));

        $engine->register(
            new EngineRegistration(
                $engine->id(),
                $services->commandBus,
                $services->eventBus,
                $services->systemPipeline,
                $services->logger
            ),
            $services
        );
    }

    public function testPlacedBuildingPersistsAcrossEngineInstances(): void
    {
        $firstServices = $this->createServices();
        $this->registerEngine($firstServices);

        $place = $firstServices->commandBus->dispatch(new Command(
            'cmd_persist_1',
            'PlaceBuilding',
            [
                'planetSeed' => 4242,
                'face' => 0,
                'depth' => 2,
                'x' => 1,
                'y' => 1,
                'type' => Building::TYPE_TOWER,
            ]
        ), $firstServices->state);

        self::assertTrue($place->success);

        // Новый инстанс сервисов и движка — то же хранилище.
        $secondServices = $this->createServices();
        $this->registerEngine($secondServices);

        $collector = new class implements EventHandlerInterface {
            /**
             * @var list<Event>
             */
            public array $events = [];

            public function handle(Event $event): void
            {
                $this->events[] = $event;
            }
        };

        $secondServices->eventBus->subscribe('ColonyAreaGenerated', $collector);

        $secondServices->commandBus->dispatch(new Command(
            'cmd_persist_2',
            'GenerateColonyArea',
            [
                'planetSeed' => 4242,
                'face' => 0,
                'depth' => 2,
                'x' => 0,
                'y' => 0,
                'size' => 4,
            ]
        ), $secondServices->state);

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
}
