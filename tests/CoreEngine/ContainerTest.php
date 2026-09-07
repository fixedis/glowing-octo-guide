<?php

declare(strict_types=1);

// tests/CoreEngine/ContainerTest.php

namespace Project\Tests\CoreEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Contracts\LoggerInterface;
use Project\CoreEngine\Core\Container;
use Project\Tests\Fixtures\Container\StubDependency;
use Project\Tests\Fixtures\Container\StubService;
use RuntimeException;

final class ContainerTest extends TestCase
{
    public function testReturnsBoundInstance(): void
    {
        $container = new Container();
        $dependency = new StubDependency();

        $container->bindInstance(StubDependency::class, $dependency);

        self::assertTrue($container->has(StubDependency::class));
        self::assertSame($dependency, $container->get(StubDependency::class));
    }

    public function testFactoryBindingIsShared(): void
    {
        $container = new Container();

        $calls = 0;

        $container->bindFactory(
            StubDependency::class,
            static function () use (&$calls): StubDependency {
                $calls++;

                return new StubDependency();
            }
        );

        $first = $container->get(StubDependency::class);
        $second = $container->get(StubDependency::class);

        self::assertSame($first, $second);
        self::assertSame(1, $calls);
    }

    public function testAutowiresConstructorDependencies(): void
    {
        $container = new Container();

        $service = $container->get(StubService::class);

        self::assertInstanceOf(StubService::class, $service);
        self::assertInstanceOf(StubDependency::class, $service->dependency);
    }

    public function testThrowsExceptionWhenInterfaceIsNotBound(): void
    {
        $container = new Container();

        $this->expectException(RuntimeException::class);

        $container->get(LoggerInterface::class);
    }
}
