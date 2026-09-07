<?php

declare(strict_types=1);

// tests/Engines/EconomyEngine/EconomyEngineTest.php

namespace Project\Tests\Engines\EconomyEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CoreEngineBootstrap;
use Project\CoreEngine\Core\CoreEngineRuntime;
use Project\CoreEngine\Core\Logging\NullLogger;

final class EconomyEngineTest extends TestCase
{
    private CoreEngineRuntime $runtime;

    protected function setUp(): void
    {
        $bootstrap = new CoreEngineBootstrap(new NullLogger());
        $this->runtime = $bootstrap->createRuntime(__DIR__ . '/../../../src/Engines', 'economy-test');
    }

    private function dispatch(Command $command): \Project\CoreEngine\Core\CommandResult
    {
        return $this->runtime->services->commandBus->dispatch($command, $this->runtime->services->state);
    }

    public function testEngineIsRegistered(): void
    {
        $ids = array_map(static fn ($e) => $e->id(), $this->runtime->services->engineRegistry->all());
        self::assertContains('economy-engine', $ids);
    }

    public function testRegisterColonyAndProduceIncome(): void
    {
        $res = $this->dispatch(new Command('r1', 'RegisterColonyEconomy', [
            'planetSeed' => 42,
            'baseYield' => 500000, // 0.5 в fixed-point
        ]));

        self::assertTrue($res->success);

        for ($i = 0; $i < 5; $i++) {
            $this->runtime->kernel->runTick();
        }

        $colony = $this->runtime->services->state->get('economy.colony.42');
        self::assertSame(2500000, $colony['stored']);
    }

    public function testRegisterRequiresValidPayload(): void
    {
        $res = $this->dispatch(new Command('r2', 'RegisterColonyEconomy', [
            'planetSeed' => -1,
            'baseYield' => 100,
        ]));

        self::assertFalse($res->success);
    }

    public function testCollectMovesToCollectedPool(): void
    {
        $this->dispatch(new Command('r3', 'RegisterColonyEconomy', [
            'planetSeed' => 7,
            'baseYield' => 1_000_000, // 1.0
        ]));

        for ($i = 0; $i < 3; $i++) {
            $this->runtime->kernel->runTick();
        }

        $collect = $this->dispatch(new Command('c1', 'CollectResources', ['planetSeed' => 7]));
        self::assertTrue($collect->success);

        self::assertSame(3_000_000, $this->runtime->services->state->get('economy.collected'));
        self::assertSame(0, $this->runtime->services->state->get('economy.colony.7')['stored']);
    }

    public function testCollectWithoutRegistrationFails(): void
    {
        $res = $this->dispatch(new Command('c2', 'CollectResources', ['planetSeed' => 999]));
        self::assertFalse($res->success);
    }

    public function testDoubleCollectFails(): void
    {
        $this->dispatch(new Command('r4', 'RegisterColonyEconomy', [
            'planetSeed' => 11,
            'baseYield' => 1_000_000,
        ]));

        $this->runtime->kernel->runTick();

        $first = $this->dispatch(new Command('c3', 'CollectResources', ['planetSeed' => 11]));
        self::assertTrue($first->success);

        $second = $this->dispatch(new Command('c4', 'CollectResources', ['planetSeed' => 11]));
        self::assertFalse($second->success);
    }
}
