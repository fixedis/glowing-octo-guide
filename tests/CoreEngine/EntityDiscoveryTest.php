<?php

declare(strict_types=1);

// tests/CoreEngine/EntityDiscoveryTest.php

namespace Project\Tests\CoreEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\EntityDiscovery;
use Project\CoreEngine\Core\EngineManifest;
use Project\CoreEngine\Core\Logging\NullLogger;
use Project\CoreEngine\Core\ManifestLoader;
use Project\Tests\Fixtures\Engines\StubEngine\Contracts\StubEntityInterface;
use Project\Tests\Fixtures\Engines\StubEngine\Entities\StubEntity;
use RuntimeException;

final class EntityDiscoveryTest extends TestCase
{
    private function fixturesStubEnginePath(): string
    {
        return __DIR__ . '/../Fixtures/Engines/StubEngine';
    }

    public function testDiscoversStubEntities(): void
    {
        $manifestLoader = new ManifestLoader(new NullLogger());

        $manifestPath = $this->fixturesStubEnginePath() . '/Config/engine.manifest.json';

        $manifest = $manifestLoader->loadFromFile($manifestPath);

        $discovery = new EntityDiscovery(new NullLogger());

        $classes = $discovery->discover($manifest);

        self::assertSame([StubEntity::class], $classes);
    }

    public function testReturnsEmptyArrayWhenEntitiesSectionIsNull(): void
    {
        $manifest = new EngineManifest(
            'no-entities-engine',
            'No Entities Engine',
            '0.1.0',
            '1.0.0',
            'Project\Tests\Fixtures\Engines\StubEngine\StubEngine',
            [],
            [],
            [],
            [],
            null,
            null,
            ''
        );

        $discovery = new EntityDiscovery(new NullLogger());

        self::assertSame([], $discovery->discover($manifest));
    }

    public function testThrowsExceptionWhenEntitiesDirectoryNotFound(): void
    {
        $manifest = new EngineManifest(
            'broken-entities-engine',
            'Broken Entities Engine',
            '0.1.0',
            '1.0.0',
            'Project\Tests\Fixtures\Engines\StubEngine\StubEngine',
            [],
            [],
            [],
            [],
            [
                'path' => 'MissingEntities',
                'interface' => StubEntityInterface::class,
                'autoload' => true,
            ],
            null,
            $this->fixturesStubEnginePath()
        );

        $discovery = new EntityDiscovery(new NullLogger());

        $this->expectException(RuntimeException::class);

        $discovery->discover($manifest);
    }
}
