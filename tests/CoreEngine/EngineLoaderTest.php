<?php

declare(strict_types=1);

// tests/CoreEngine/EngineLoaderTest.php

namespace Project\Tests\CoreEngine;

use LogicException;
use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\CommandBus;
use Project\CoreEngine\Core\Container;
use Project\CoreEngine\Core\CoreServices;
use Project\CoreEngine\Core\DeterministicRandom;
use Project\CoreEngine\Core\EngineDependencyResolver;
use Project\CoreEngine\Core\EngineFactory;
use Project\CoreEngine\Core\EngineLoader;
use Project\CoreEngine\Core\EngineRegistry;
use Project\CoreEngine\Core\EntityDiscovery;
use Project\CoreEngine\Core\EntityRegistry;
use Project\CoreEngine\Core\EventBus;
use Project\CoreEngine\Core\InMemorySnapshotStore;
use Project\CoreEngine\Core\Kernel;
use Project\CoreEngine\Core\Logging\NullLogger;
use Project\CoreEngine\Core\ManifestLoader;
use Project\CoreEngine\Core\MathKernel;
use Project\CoreEngine\Core\SnapshotManager;
use Project\CoreEngine\Core\State;
use Project\CoreEngine\Core\SystemPipeline;
use Project\Tests\Fixtures\Engines\RegistrableStubEngine\RegistrableStubEngine;
use Project\Tests\Fixtures\Engines\StubEngine\Entities\StubEntity;
use Project\Tests\Fixtures\Engines\StubEngine\StubEngine;

final class EngineLoaderTest extends TestCase
{
    private function fixturesEnginesPath(): string
    {
        return __DIR__ . '/../Fixtures/Engines';
    }

    private function createCoreServices(EngineRegistry $engineRegistry): CoreServices
    {
        $logger = new NullLogger();
        $state = new State();
        $eventBus = new EventBus($logger);
        $commandBus = new CommandBus($eventBus, $logger);
        $systemPipeline = new SystemPipeline($logger);
        $entityRegistry = new EntityRegistry($logger);
        $container = new Container();
        $math = new MathKernel($logger);
        $random = new DeterministicRandom($logger, 'core-engine-test-seed');
        $snapshotStore = new InMemorySnapshotStore();
        $snapshots = new SnapshotManager($snapshotStore, $logger);
        $kernel = new Kernel(
            $state,
            $commandBus,
            $eventBus,
            $engineRegistry,
            $systemPipeline,
            $random,
            $snapshots,
            $logger
        );

        return new CoreServices(
            $state,
            $eventBus,
            $commandBus,
            $systemPipeline,
            $engineRegistry,
            $entityRegistry,
            $container,
            $math,
            $random,
            $snapshots,
            $kernel,
            $logger
        );
    }

    private function createLoader(CoreServices $coreServices): EngineLoader
    {
        return new EngineLoader(
            new ManifestLoader($coreServices->logger),
            new EngineFactory($coreServices->logger),
            $coreServices,
            new EngineDependencyResolver($coreServices->logger),
            new EntityDiscovery($coreServices->logger)
        );
    }

    public function testLoadsEnginesFromDirectoryAndRegistersThem(): void
    {
        $engineRegistry = new EngineRegistry(new NullLogger());
        $coreServices = $this->createCoreServices($engineRegistry);
        $loader = $this->createLoader($coreServices);

        $engines = $loader->loadFromDirectory($this->fixturesEnginesPath());

        self::assertArrayHasKey('stub-engine', $engines);
        self::assertArrayHasKey('registrable-stub-engine', $engines);

        self::assertTrue($engineRegistry->has('stub-engine'));
        self::assertTrue($engineRegistry->has('registrable-stub-engine'));

        self::assertInstanceOf(StubEngine::class, $engineRegistry->get('stub-engine'));
        self::assertInstanceOf(
            RegistrableStubEngine::class,
            $engineRegistry->get('registrable-stub-engine')
        );

        self::assertTrue(true === $coreServices->state->get('registrable_stub_registered'));
        self::assertSame(
            'registrable-stub-engine',
            $coreServices->state->get('registrable_stub_engine_id')
        );

        self::assertTrue($coreServices->entityRegistry->hasEngine('stub-engine'));
        self::assertSame(
            [StubEntity::class],
            $coreServices->entityRegistry->classesForEngine('stub-engine')
        );
    }

    public function testLoadManifestRegistersSingleEngine(): void
    {
        $engineRegistry = new EngineRegistry(new NullLogger());
        $coreServices = $this->createCoreServices($engineRegistry);
        $loader = $this->createLoader($coreServices);

        $manifestLoader = new ManifestLoader($coreServices->logger);

        $manifestPath = $this->fixturesEnginesPath()
            . '/StubEngine/Config/engine.manifest.json';

        $manifest = $manifestLoader->loadFromFile($manifestPath);

        $engine = $loader->loadManifest($manifest);

        self::assertSame('stub-engine', $engine->id());
        self::assertTrue($engineRegistry->has('stub-engine'));
        self::assertInstanceOf(StubEngine::class, $engineRegistry->get('stub-engine'));

        self::assertTrue($coreServices->entityRegistry->hasEngine('stub-engine'));
        self::assertSame(
            [StubEntity::class],
            $coreServices->entityRegistry->classesForEngine('stub-engine')
        );
    }

    public function testThrowsExceptionWhenLoadingSameEngineTwice(): void
    {
        $engineRegistry = new EngineRegistry(new NullLogger());
        $coreServices = $this->createCoreServices($engineRegistry);
        $loader = $this->createLoader($coreServices);

        $loader->loadFromDirectory($this->fixturesEnginesPath());

        $this->expectException(LogicException::class);

        $loader->loadFromDirectory($this->fixturesEnginesPath());
    }
}
