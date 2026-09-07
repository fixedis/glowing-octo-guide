<?php

declare(strict_types=1);

// tests/Engines/UniverseEngine/Presentation/UniverseRouterTest.php

namespace Project\Tests\Engines\UniverseEngine\Presentation;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\CommandBus;
use Project\CoreEngine\Core\Container;
use Project\CoreEngine\Core\CoreServices;
use Project\CoreEngine\Core\DeterministicRandom;
use Project\CoreEngine\Core\EngineRegistration;
use Project\CoreEngine\Core\EngineRegistry;
use Project\CoreEngine\Core\EntityRegistry;
use Project\CoreEngine\Core\EventBus;
use Project\CoreEngine\Core\InMemorySnapshotStore;
use Project\CoreEngine\Core\Kernel;
use Project\CoreEngine\Core\Logging\NullLogger;
use Project\CoreEngine\Core\MathKernel;
use Project\CoreEngine\Core\SnapshotManager;
use Project\CoreEngine\Core\State;
use Project\CoreEngine\Core\SystemPipeline;
use Project\Engines\UniverseEngine\Entities\Buildings\Building;
use Project\Engines\UniverseEngine\Presentation\HttpRequest;
use Project\Engines\UniverseEngine\Presentation\UniverseRouter;
use Project\Engines\UniverseEngine\UniverseEngine;

final class UniverseRouterTest extends TestCase
{
    private CoreServices $services;
    private UniverseRouter $router;

    protected function setUp(): void
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
            new DeterministicRandom($logger, 'router-test-seed'),
            new SnapshotManager(new InMemorySnapshotStore(), $logger),
            $logger
        );

        $this->services = new CoreServices(
            $state,
            $eventBus,
            $commandBus,
            $systemPipeline,
            new EngineRegistry($logger),
            new EntityRegistry($logger),
            new Container(),
            new MathKernel($logger),
            new DeterministicRandom($logger, 'router-test-seed'),
            new SnapshotManager(new InMemorySnapshotStore(), $logger),
            $kernel,
            $logger
        );

        $engine = new UniverseEngine();

        $this->services->engineRegistry->register($engine);

        $engine->register(
            new EngineRegistration(
                $engine->id(),
                $this->services->commandBus,
                $this->services->eventBus,
                $this->services->systemPipeline,
                $this->services->logger
            ),
            $this->services
        );

        $this->router = new UniverseRouter($this->services, $logger);
    }

    public function testHealthReturnsEngines(): void
    {
        $response = $this->router->handle(new HttpRequest('GET', '/api/v1/health'));

        self::assertSame(200, $response->status);
        self::assertSame('ok', $response->payload['status']);

        $ids = array_column($response->payload['engines'], 'id');

        self::assertContains('universe-engine', $ids);
    }

    public function testGalaxiesRoute(): void
    {
        $response = $this->router->handle(new HttpRequest(
            'GET',
            '/api/v1/universe/galaxies',
            ['seed' => 1337, 'cx' => 0, 'cy' => 0, 'cz' => 0]
        ));

        self::assertSame(200, $response->status);
        self::assertIsArray($response->payload['data']['galaxies']);
    }

    public function testGalaxiesRouteRejectsMissingParam(): void
    {
        $response = $this->router->handle(new HttpRequest(
            'GET',
            '/api/v1/universe/galaxies',
            ['seed' => 1337]
        ));

        self::assertSame(400, $response->status);
    }

    public function testSystemsRoute(): void
    {
        $response = $this->router->handle(new HttpRequest(
            'GET',
            '/api/v1/galaxies/666013/systems',
            ['radius' => 60]
        ));

        self::assertSame(200, $response->status);
        self::assertNotEmpty($response->payload['data']['systems']);
        self::assertIsArray($response->payload['data']['routes']);
    }

    public function testPlanetsRoute(): void
    {
        $response = $this->router->handle(new HttpRequest(
            'GET',
            '/api/v1/systems/1234/planets',
            ['count' => 6]
        ));

        self::assertSame(200, $response->status);
        self::assertCount(6, $response->payload['data']['planets']);
    }

    public function testColonyRoute(): void
    {
        $response = $this->router->handle(new HttpRequest(
            'GET',
            '/api/v1/planets/1337/colony',
            ['face' => 0, 'depth' => 2, 'x' => 0, 'y' => 0, 'size' => 4]
        ));

        self::assertSame(200, $response->status);
        self::assertIsArray($response->payload['data']['buildings']);
    }

    public function testPlaceThenColonyShowsBuilding(): void
    {
        $place = $this->router->handle(new HttpRequest(
            'POST',
            '/api/v1/planets/1337/colony/place',
            [],
            ['face' => 0, 'depth' => 2, 'x' => 1, 'y' => 1, 'type' => Building::TYPE_TOWER]
        ));

        self::assertSame(200, $place->status);

        $colony = $this->router->handle(new HttpRequest(
            'GET',
            '/api/v1/planets/1337/colony',
            ['face' => 0, 'depth' => 2, 'x' => 0, 'y' => 0, 'size' => 4]
        ));

        $found = null;

        foreach ($colony->payload['data']['buildings'] as $building) {
            if ($building['x'] === 1 && $building['y'] === 1) {
                $found = $building;
            }
        }

        self::assertNotNull($found);
        self::assertSame(Building::TYPE_TOWER, $found['type']);
    }

    public function testDemolishRoute(): void
    {
        $this->router->handle(new HttpRequest(
            'POST',
            '/api/v1/planets/1337/colony/place',
            [],
            ['face' => 0, 'depth' => 2, 'x' => 2, 'y' => 2, 'type' => Building::TYPE_DOME]
        ));

        $demolish = $this->router->handle(new HttpRequest(
            'POST',
            '/api/v1/planets/1337/colony/demolish',
            [],
            ['face' => 0, 'depth' => 2, 'x' => 2, 'y' => 2]
        ));

        self::assertSame(200, $demolish->status);

        $colony = $this->router->handle(new HttpRequest(
            'GET',
            '/api/v1/planets/1337/colony',
            ['face' => 0, 'depth' => 2, 'x' => 0, 'y' => 0, 'size' => 4]
        ));

        foreach ($colony->payload['data']['buildings'] as $building) {
            self::assertFalse($building['x'] === 2 && $building['y'] === 2);
        }
    }

    public function testUnknownRouteReturns404(): void
    {
        $response = $this->router->handle(new HttpRequest('GET', '/api/v1/nope'));

        self::assertSame(404, $response->status);
    }

    public function testBadSeedInPathReturns400(): void
    {
        $response = $this->router->handle(new HttpRequest('GET', '/api/v1/galaxies/abc/systems'));

        self::assertSame(400, $response->status);
    }
}
