<?php

declare(strict_types=1);

// tests/CoreEngine/ContainerEngineInstantiatorTest.php

namespace Project\Tests\CoreEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\Container;
use Project\CoreEngine\Core\ContainerEngineInstantiator;
use Project\CoreEngine\Core\Logging\NullLogger;
use Project\Tests\Fixtures\Engines\StubEngine\StubEngine;
use RuntimeException;
use stdClass;

final class ContainerEngineInstantiatorTest extends TestCase
{
    public function testInstantiatesEngineThroughContainer(): void
    {
        $container = new Container();
        $instantiator = new ContainerEngineInstantiator($container, new NullLogger());

        $engine = $instantiator->instantiate(StubEngine::class);

        self::assertInstanceOf(StubEngine::class, $engine);
        self::assertSame('stub-engine', $engine->id());
        self::assertSame('0.1.0', $engine->version());
    }

    public function testThrowsExceptionWhenContainerReturnsNonEngine(): void
    {
        $container = new Container();
        $instantiator = new ContainerEngineInstantiator($container, new NullLogger());

        $this->expectException(RuntimeException::class);

        $instantiator->instantiate(stdClass::class);
    }
}
