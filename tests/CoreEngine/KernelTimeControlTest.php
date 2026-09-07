<?php

declare(strict_types=1);

// tests/CoreEngine/KernelTimeControlTest.php

namespace Project\Tests\CoreEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CoreEngineBootstrap;
use Project\CoreEngine\Core\Logging\NullLogger;

final class KernelTimeControlTest extends TestCase
{
    private function kernel()
    {
        $bootstrap = new CoreEngineBootstrap(new NullLogger());
        $runtime = $bootstrap->createRuntime(__DIR__ . '/../../src/Engines', 'time-control-test');

        return $runtime->kernel;
    }

    public function testInitialState(): void
    {
        $kernel = $this->kernel();
        self::assertSame(0, $kernel->currentTick());
        self::assertFalse($kernel->isPaused());
        self::assertSame(1, $kernel->getSpeed());
    }

    public function testPauseResume(): void
    {
        $kernel = $this->kernel();
        $kernel->pause();
        self::assertTrue($kernel->isPaused());

        $kernel->resume();
        self::assertFalse($kernel->isPaused());
    }

    public function testStepRunsExactlyOneTick(): void
    {
        $kernel = $this->kernel();
        $kernel->pause();

        $kernel->step();
        self::assertSame(1, $kernel->currentTick());

        $kernel->step();
        self::assertSame(2, $kernel->currentTick());
    }

    public function testSetSpeedClamps(): void
    {
        $kernel = $this->kernel();
        $kernel->setSpeed(8);
        self::assertSame(8, $kernel->getSpeed());

        $this->expectException(\InvalidArgumentException::class);
        $kernel->setSpeed(100);
    }

    public function testRunTickAdvancesTick(): void
    {
        $kernel = $this->kernel();
        $kernel->runTick();
        $kernel->runTick();
        self::assertSame(2, $kernel->currentTick());
    }
}
