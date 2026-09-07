<?php

declare(strict_types=1);

// tests/CoreEngine/EngineDependencyResolverTest.php

namespace Project\Tests\CoreEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\EngineDependencyResolver;
use Project\CoreEngine\Core\EngineManifest;
use Project\CoreEngine\Core\Logging\NullLogger;
use RuntimeException;

final class EngineDependencyResolverTest extends TestCase
{
    private function createManifest(
        string $id,
        array $requires = [],
        array $provides = []
    ): EngineManifest {
        return new EngineManifest(
            $id,
            $id,
            '0.1.0',
            '1.0.0',
            'Project\Tests\Fixtures\Engines\StubEngine\StubEngine',
            $requires,
            $provides,
            [],
            [],
            null,
            null,
            ''
        );
    }

    public function testResolvesManifestsWithCoreRequirements(): void
    {
        $resolver = new EngineDependencyResolver(new NullLogger());

        $manifests = [
            'test-engine' => $this->createManifest(
                'test-engine',
                ['core.events', 'core.state'],
                ['test.feature']
            ),
        ];

        $resolved = $resolver->resolve($manifests);

        self::assertCount(1, $resolved);
        self::assertSame('test-engine', $resolved[0]->id);
    }

    public function testOrdersDependencyProviderBeforeDependent(): void
    {
        $resolver = new EngineDependencyResolver(new NullLogger());

        $manifests = [
            'engine-b' => $this->createManifest(
                'engine-b',
                ['engine-a.feature']
            ),
            'engine-a' => $this->createManifest(
                'engine-a',
                [],
                ['engine-a.feature']
            ),
        ];

        $resolved = $resolver->resolve($manifests);

        self::assertCount(2, $resolved);
        self::assertSame('engine-a', $resolved[0]->id);
        self::assertSame('engine-b', $resolved[1]->id);
    }

    public function testThrowsExceptionWhenDependencyIsMissing(): void
    {
        $resolver = new EngineDependencyResolver(new NullLogger());

        $manifests = [
            'broken-engine' => $this->createManifest(
                'broken-engine',
                ['missing.feature']
            ),
        ];

        $this->expectException(RuntimeException::class);

        $resolver->resolve($manifests);
    }

    public function testThrowsExceptionWhenCapabilityIsProvidedTwice(): void
    {
        $resolver = new EngineDependencyResolver(new NullLogger());

        $manifests = [
            'engine-a' => $this->createManifest(
                'engine-a',
                [],
                ['shared.feature']
            ),
            'engine-b' => $this->createManifest(
                'engine-b',
                [],
                ['shared.feature']
            ),
        ];

        $this->expectException(RuntimeException::class);

        $resolver->resolve($manifests);
    }

    public function testThrowsExceptionOnCircularDependency(): void
    {
        $resolver = new EngineDependencyResolver(new NullLogger());

        $manifests = [
            'engine-a' => $this->createManifest(
                'engine-a',
                ['engine-b.feature'],
                ['engine-a.feature']
            ),
            'engine-b' => $this->createManifest(
                'engine-b',
                ['engine-a.feature'],
                ['engine-b.feature']
            ),
        ];

        $this->expectException(RuntimeException::class);

        $resolver->resolve($manifests);
    }
}
