<?php

declare(strict_types=1);

// tests/Engines/AdminEngine/AdminEngineTest.php

namespace Project\Tests\Engines\AdminEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CoreEngineBootstrap;
use Project\CoreEngine\Core\CoreEngineRuntime;
use Project\CoreEngine\Core\Logging\NullLogger;

final class AdminEngineTest extends TestCase
{
    private CoreEngineRuntime $runtime;

    protected function setUp(): void
    {
        $bootstrap = new CoreEngineBootstrap(new NullLogger());
        $this->runtime = $bootstrap->createRuntime(__DIR__ . '/../../../src/Engines', 'admin-test');
    }

    private function dispatch(Command $command): \Project\CoreEngine\Core\CommandResult
    {
        return $this->runtime->services->commandBus->dispatch($command, $this->runtime->services->state);
    }

    public function testEngineRegistered(): void
    {
        $ids = array_map(static fn ($e) => $e->id(), $this->runtime->services->engineRegistry->all());
        self::assertContains('admin-engine', $ids);
    }

    public function testGodModeGatesSpawn(): void
    {
        // Без godmode спавн вне границ падает.
        $r1 = $this->dispatch(new Command('s1', 'SpawnPlanet', [
            'seed' => 999, 'type' => 'terran', 'radiusKm' => 6000,
            'semiMajorAxisAuMilli' => 100000, 'eccentricityFixed' => 100000,
            'inclinationFixed' => 100000, 'x' => 9999999, 'y' => 0, 'z' => 0,
        ]));
        self::assertFalse($r1->success);

        // Включаем godmode.
        $r2 = $this->dispatch(new Command('g1', 'AdminSetGodMode', ['enabled' => true]));
        self::assertTrue($r2->success);

        // Теперь спавн проходит.
        $r3 = $this->dispatch(new Command('s2', 'SpawnPlanet', [
            'seed' => 999, 'type' => 'terran', 'radiusKm' => 6000,
            'semiMajorAxisAuMilli' => 100000, 'eccentricityFixed' => 100000,
            'inclinationFixed' => 100000, 'x' => 9999999, 'y' => 0, 'z' => 0,
        ]));
        self::assertTrue($r3->success);
        self::assertNotNull($this->runtime->services->state->get('universe.spawned.planet.999'));
    }

    public function testEditEconomyAndGrant(): void
    {
        $this->dispatch(new Command('r1', 'RegisterColonyEconomy', [
            'planetSeed' => 42, 'baseYield' => 500000,
        ]));

        $edit = $this->dispatch(new Command('e1', 'AdminEditEconomy', [
            'planetSeed' => 42, 'baseYield' => 2000000,
        ]));
        self::assertTrue($edit->success);

        $grant = $this->dispatch(new Command('g1', 'AdminGrantResources', [
            'planetSeed' => 42, 'amount' => 777000,
        ]));
        self::assertTrue($grant->success);

        $colony = $this->runtime->services->state->get('economy.colony.42');
        self::assertSame(2000000, $colony['baseYield']);
        self::assertSame(777000, $colony['stored']);
    }

    public function testEditEconomyRequiresRegistration(): void
    {
        $res = $this->dispatch(new Command('e2', 'AdminEditEconomy', [
            'planetSeed' => 404, 'baseYield' => 100,
        ]));
        self::assertFalse($res->success);
    }

    public function testNaniteBudgetOverride(): void
    {
        $res = $this->dispatch(new Command('n1', 'AdminSetNaniteBudget', [
            'streaming' => 512, 'simulation' => 128,
        ]));
        self::assertTrue($res->success);
        self::assertSame(512, $this->runtime->services->state->get('nanite.streamingBudget'));
        self::assertSame(128, $this->runtime->services->state->get('nanite.simulationBudget'));
    }

    public function testSaveAndLoadSnapshot(): void
    {
        $this->runtime->kernel->runTick();
        $save = $this->dispatch(new Command('sv1', 'AdminSaveSnapshot', []));
        self::assertTrue($save->success);

        $tick = $save->events[0]->payload['tick'];
        $load = $this->dispatch(new Command('ld1', 'AdminLoadSnapshot', ['tick' => $tick]));
        self::assertTrue($load->success);
    }

    public function testAuthenticateDevMode(): void
    {
        $res = $this->dispatch(new Command('a1', 'AdminAuthenticate', ['token' => 'anything']));
        self::assertTrue($res->success);
        self::assertNotNull($this->runtime->services->state->get('admin.session'));
    }
}
