<?php

declare(strict_types=1);

// tests/Engines/CombatEngine/CombatEngineTest.php

namespace Project\Tests\Engines\CombatEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CoreEngineBootstrap;
use Project\CoreEngine\Core\CoreEngineRuntime;
use Project\CoreEngine\Core\Logging\NullLogger;

/**
 * Интеграционные тесты CombatEngine.
 *
 * Проверяют цепочку Economy -> Production -> Fleet -> Combat: два флота из разных
 * колоний, разрешение боя (детерминизм через ядро RNG), списание боеприпасов из
 * economy.colony.*.stored, фиксация потерь в fleet.*, а также отказы (нет флота,
 * нехватка ammo, пустые флоты).
 */
final class CombatEngineTest extends TestCase
{
    private CoreEngineRuntime $runtime;

    protected function setUp(): void
    {
        $bootstrap = new CoreEngineBootstrap(new NullLogger());
        $this->runtime = $bootstrap->createRuntime(__DIR__ . '/../../../src/Engines', 'combat-test');
    }

    private function dispatch(Command $command): \Project\CoreEngine\Core\CommandResult
    {
        return $this->runtime->services->commandBus->dispatch($command, $this->runtime->services->state);
    }

    /**
     * Регистрирует экономику колонии, крутит тики и производит $unitCount дронов,
     * затем формирует флот. Возвращает fleetSeed.
     */
    private function buildFleet(int $colonySeed, int $fleetSeed, int $unitCount): void
    {
        $reg = $this->dispatch(new Command('reg-' . $colonySeed, 'RegisterColonyEconomy', [
            'planetSeed' => $colonySeed,
            'baseYield' => 1_000_000,
        ]));
        self::assertTrue($reg->success);

        for ($i = 0; $i < $unitCount; $i++) {
            $this->runtime->kernel->runTick();
            $produce = $this->dispatch(new Command('u-' . $colonySeed . '-' . $i, 'ProduceUnit', [
                'planetSeed' => $colonySeed,
                'type' => 'drone',
                'cost' => 100_000,
            ]));
            self::assertTrue($produce->success);
        }

        $form = $this->dispatch(new Command('f-' . $fleetSeed, 'FormFleet', [
            'fleetSeed' => $fleetSeed,
            'ownerColonySeed' => $colonySeed,
            'type' => 'strike',
            'unitIndices' => range(0, $unitCount - 1),
        ]));
        self::assertTrue($form->success);
    }

    public function testEngineIsRegistered(): void
    {
        $ids = array_map(static fn ($e) => $e->id(), $this->runtime->services->engineRegistry->all());
        self::assertContains('combat-engine', $ids);
    }

    public function testResolveCombatSpendsAmmoAndAppliesLosses(): void
    {
        $this->buildFleet(42, 100, 3);  // атакующий: 3 дрона
        $this->buildFleet(43, 200, 3);  // защитник: 3 дрона

        $res = $this->dispatch(new Command('c1', 'ResolveCombat', [
            'attackerFleetSeed' => 100,
            'defenderFleetSeed' => 200,
            'ammoCost' => 50_000,
        ]));

        self::assertTrue($res->success);
        self::assertSame('CombatResolved', $res->events[0]->type);

        $ev = $res->events[0];
        self::assertSame(3, $ev->payload['attackerPower']);
        self::assertSame(3, $ev->payload['defenderPower']);
        self::assertSame(100_000, $ev->payload['ammoSpent']); // 50k * 2

        // Тики глобальные: colony 42 капает в обоих buildFleet (6 тиков),
        // colony 43 — только в своём (3 тика). stored уже уменьшен на продукцию/ammo.
        // colony 42: 6M - 300k(прод) - 50k(ammo) = 5_650_000.
        // colony 43: 3M - 300k(прод) - 50k(ammo) = 2_650_000.
        $colonyA = $this->runtime->services->state->get('economy.colony.42');
        $colonyB = $this->runtime->services->state->get('economy.colony.43');
        self::assertSame(5_650_000, $colonyA['stored']);
        self::assertSame(2_650_000, $colonyB['stored']);

        // У проигравшего потери больше, чем у победителя; сумма не превышает 6 (по 3 в каждом флоте).
        $lossWinner = $ev->payload['winnerUnitLoss'];
        $lossLoser = $ev->payload['loserUnitLoss'];
        self::assertLessThanOrEqual($lossLoser, $lossWinner);
        self::assertLessThanOrEqual(6, $lossWinner + $lossLoser);
    }

    public function testResolveCombatRejectsUnknownAttackerFleet(): void
    {
        $this->buildFleet(44, 300, 1);

        $res = $this->dispatch(new Command('c2', 'ResolveCombat', [
            'attackerFleetSeed' => 99999,
            'defenderFleetSeed' => 300,
        ]));
        self::assertFalse($res->success);
    }

    public function testResolveCombatRejectsUnknownDefenderFleet(): void
    {
        $this->buildFleet(45, 301, 1);

        $res = $this->dispatch(new Command('c3', 'ResolveCombat', [
            'attackerFleetSeed' => 301,
            'defenderFleetSeed' => 88888,
        ]));
        self::assertFalse($res->success);
    }

    public function testResolveCombatFailsWhenNotEnoughAmmo(): void
    {
        $this->buildFleet(46, 302, 1);
        $this->buildFleet(47, 303, 1);

        // Бюджет ammo больше накопленного stored (1 тик * 1M - 100k прод = 900k).
        $res = $this->dispatch(new Command('c4', 'ResolveCombat', [
            'attackerFleetSeed' => 302,
            'defenderFleetSeed' => 303,
            'ammoCost' => 5_000_000,
        ]));
        self::assertFalse($res->success);
        self::assertStringContainsString('not enough ammo', $res->errorMessage);
    }

    public function testResolveCombatIsDeterministicAcrossReplays(): void
    {
        $this->buildFleet(48, 304, 4);
        $this->buildFleet(49, 305, 2);

        $first = $this->dispatch(new Command('c5a', 'ResolveCombat', [
            'attackerFleetSeed' => 304,
            'defenderFleetSeed' => 305,
            'ammoCost' => 10_000,
        ]));
        self::assertTrue($first->success);

        $firstWinner = $first->events[0]->payload['winner'];

        // Второй бой с теми же составами/seed/tick -> тот же исход (RNG ядра).
        $second = $this->dispatch(new Command('c5b', 'ResolveCombat', [
            'attackerFleetSeed' => 304,
            'defenderFleetSeed' => 305,
            'ammoCost' => 10_000,
        ]));
        self::assertTrue($second->success);

        self::assertSame($firstWinner, $second->events[0]->payload['winner']);
    }

    public function testResolveCombatWithEqualEmptyFleetsUsesRng(): void
    {
        // Флоты без юнитов (владелец не задан) — бой без ammo, равные силы.
        $this->runtime->services->state->set('fleet.900', [
            'fleetSeed' => 900,
            'ownerColonySeed' => 0,
            'type' => 'strike',
            'units' => [],
            'x' => 0, 'y' => 0, 'z' => 0,
        ]);
        $this->runtime->services->state->set('fleet.901', [
            'fleetSeed' => 901,
            'ownerColonySeed' => 0,
            'type' => 'strike',
            'units' => [],
            'x' => 0, 'y' => 0, 'z' => 0,
        ]);

        $res = $this->dispatch(new Command('c6', 'ResolveCombat', [
            'attackerFleetSeed' => 900,
            'defenderFleetSeed' => 901,
        ]));
        self::assertTrue($res->success);
        self::assertContains($res->events[0]->payload['winner'], ['attacker', 'defender']);
    }
}
