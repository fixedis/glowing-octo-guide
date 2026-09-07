<?php

declare(strict_types=1);

// tests/CoreEngine/EngineFactoryTest.php

namespace Project\Tests\CoreEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Contracts\EngineInterface;
use Project\CoreEngine\Core\EngineFactory;
use Project\CoreEngine\Core\EngineManifest;
use Project\CoreEngine\Core\Logging\NullLogger;
use Project\CoreEngine\Core\ManifestLoader;
use Project\Tests\Fixtures\Engines\StubEngine\StubEngine;
use RuntimeException;
use stdClass;

final class EngineFactoryTest extends TestCase
{
    private function manifestLoader(): ManifestLoader
    {
        return new ManifestLoader(new NullLogger());
    }

    private function stubManifestPath(): string
    {
        return __DIR__ . '/../Fixtures/Engines/StubEngine/Config/engine.manifest.json';
    }

    public function testCreatesEngineFromManifest(): void
    {
        $manifest = $this->manifestLoader()->loadFromFile($this->stubManifestPath());

        $factory = new EngineFactory(new NullLogger());

        $engine = $factory->create($manifest);

        self::assertInstanceOf(EngineInterface::class, $engine);
        self::assertInstanceOf(StubEngine::class, $engine);
        self::assertSame('stub-engine', $engine->id());
        self::assertSame('0.1.0', $engine->version());
    }

    public function testThrowsExceptionWhenEngineClassNotFound(): void
    {
        $manifest = new EngineManifest(
            'broken-engine',
            'Broken Engine',
            '0.1.0',
            '1.0.0',
            'Project\Tests\Fixtures\Engines\Missing\MissingEngine',
            [],
            [],
            [],
            [],
            null,
            null,
            ''
        );

        $factory = new EngineFactory(new NullLogger());

        $this->expectException(RuntimeException::class);

        $factory->create($manifest);
    }

    public function testThrowsExceptionWhenClassDoesNotImplementEngineInterface(): void
    {
        $manifest = new EngineManifest(
            'invalid-engine',
            'Invalid Engine',
            '0.1.0',
            '1.0.0',
            stdClass::class,
            [],
            [],
            [],
            [],
            null,
            null,
            ''
        );

        $factory = new EngineFactory(new NullLogger());

        $this->expectException(RuntimeException::class);

        $factory->create($manifest);
    }
}
