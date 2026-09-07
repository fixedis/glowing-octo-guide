<?php

declare(strict_types=1);

// tests/CoreEngine/CoreEngineBootstrapTest.php

namespace Project\Tests\CoreEngine;

use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\CoreEngineBootstrap;
use Project\CoreEngine\Core\Logging\NullLogger;

final class CoreEngineBootstrapTest extends TestCase
{
    private function fixturesEnginesPath(): string
    {
        return __DIR__ . '/../Fixtures/Engines';
    }

    public function testBootstrapCreatesRuntimeAndLoadsEngines(): void
    {
        $bootstrap = new CoreEngineBootstrap(new NullLogger());

        $runtime = $bootstrap->createRuntime(
            $this->fixturesEnginesPath(),
            'bootstrap-test-seed'
        );

        self::assertTrue($runtime->services->engineRegistry->has('stub-engine'));
        self::assertTrue($runtime->services->engineRegistry->has('registrable-stub-engine'));

        self::assertTrue(
            true === $runtime->services->state->get('registrable_stub_registered')
        );

        self::assertSame(
            'registrable-stub-engine',
            $runtime->services->state->get('registrable_stub_engine_id')
        );
    }

    public function testBootstrapKernelCanRunTick(): void
    {
        $bootstrap = new CoreEngineBootstrap(new NullLogger());

        $runtime = $bootstrap->createRuntime(
            $this->fixturesEnginesPath(),
            'bootstrap-tick-seed'
        );

        $snapshot = $runtime->kernel->runTick();

        self::assertSame(1, $snapshot->tick);
        self::assertNotSame('', $snapshot->hash);
        self::assertIsArray($snapshot->state);
    }

    public function testBootstrapThrowsExceptionWhenEnginesPathDoesNotExist(): void
    {
        $bootstrap = new CoreEngineBootstrap(new NullLogger());

        $this->expectException(InvalidArgumentException::class);

        $bootstrap->createRuntime(
            __DIR__ . '/../Fixtures/MissingEngines',
            'bootstrap-missing-path-seed'
        );
    }
}
