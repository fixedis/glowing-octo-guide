<?php

declare(strict_types=1);

// tests/CoreEngine/ManifestLoaderTest.php

namespace Project\Tests\CoreEngine;

use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\Logging\NullLogger;
use Project\CoreEngine\Core\ManifestLoader;

final class ManifestLoaderTest extends TestCase
{
    private function fixturesEnginesPath(): string
    {
        return __DIR__ . '/../Fixtures/Engines';
    }

    public function testLoadsValidManifestFromFile(): void
    {
        $loader = new ManifestLoader(new NullLogger());

        $manifestPath = $this->fixturesEnginesPath()
            . '/StubEngine/Config/engine.manifest.json';

        $manifest = $loader->loadFromFile($manifestPath);

        self::assertSame('stub-engine', $manifest->id);
        self::assertSame('Stub Engine', $manifest->name);
        self::assertSame('0.1.0', $manifest->version);
        self::assertSame('1.0.0', $manifest->apiVersion);
        self::assertSame(
            'Project\Tests\Fixtures\Engines\StubEngine\StubEngine',
            $manifest->engineClass
        );

        self::assertSame([
            'core.engine',
            'core.events',
        ], $manifest->requires);

        self::assertSame([
            'stub.feature',
        ], $manifest->provides);

        self::assertSame([
            'StubCommand',
        ], $manifest->commands);

        self::assertSame([
            'StubEvent',
        ], $manifest->events);

        self::assertNotNull($manifest->entities);
        self::assertSame('Entities', $manifest->entities['path']);
        self::assertSame(
            'Project\Tests\Fixtures\Engines\StubEngine\Contracts\StubEntityInterface',
            $manifest->entities['interface']
        );
        self::assertTrue($manifest->entities['autoload']);

        self::assertSame('Bridge/StubCoreAdapter.php', $manifest->bridge);
        self::assertTrue(str_ends_with($manifest->basePath, 'StubEngine'));
    }

    public function testLoadsAllManifestsFromEnginesDirectory(): void
    {
        $loader = new ManifestLoader(new NullLogger());

        $manifests = $loader->loadFromEnginesDirectory($this->fixturesEnginesPath());

        self::assertArrayHasKey('stub-engine', $manifests);
        self::assertSame('Stub Engine', $manifests['stub-engine']->name);
    }

    public function testThrowsExceptionWhenManifestFileNotFound(): void
    {
        $loader = new ManifestLoader(new NullLogger());

        $this->expectException(InvalidArgumentException::class);

        $loader->loadFromFile($this->fixturesEnginesPath() . '/MissingEngine/Config/engine.manifest.json');
    }
}
