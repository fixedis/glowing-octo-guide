<?php

declare(strict_types=1);

// tests/Engines/FleetEngine/FleetEngineTest.php

namespace Project\Tests\Engines\FleetEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CoreEngineBootstrap;
use Project\CoreEngine\Core\CoreEngineRuntime;
use Project\CoreEngine\Core\Logging\NullLogger;

/**
 * Интеграционные тесты FleetEngine.
 *
 * Проверяют: регистрацию движка, формирование флота из произведённых юнитов
 * (production.colony.*.units), перемещение по координатам (fixed-point, кламп),
 * десант на планету (universe.spawned.planet.*) с проверкой расстояния,
 * а также отказы: нет юнитов / нет флота / нет планеты / слишком далеко /
 * дубликат индекса / повторное формирование.
 */
final class FleetEngineTest extends TestCase
{
    private CoreEngineRuntime $runtime;

    protected function setUp(): void
    {
        $bootstrap = new CoreEngineBootstrap(new NullLogger());
        $this->runtime = $bootstrap->createRuntime(__DIR__ . '/../../../src/Engines', 'fleet-test');
    }

    private function dispatch(Command $command): \Project\CoreEngine\Core\CommandResult
    {
        return $this->runtime->services->commandBus->dispatch($command, $this->runtime->services->state);
    }

    /**
     * Готовит колонию с двумя юнитами в production.colony.*.units.
     */
    private function seedColonyWithUnits(int $colonySeed, int $unitCount): void
    {
        // Регистрируем экономику + тик, чтобы колония существовала в economy.colony.*.
        $reg = $this->dispatch(new Command('reg-' . $colonySeed, 'RegisterColonyEconomy', [
            'planetSeed' => $colonySeed,
            'baseYield' => 1_000_000,
        ]));
        self::assertTrue($reg->success);

        // Прокручием тики, чтобы накопился stored (доход 1_000_000 за тик).
        for ($i = 0; $i < $unitCount; $i++) {
            $this->runtime->kernel->runTick();

            $produce = $this->dispatch(new Command('u-' . $colonySeed . '-' . $i, 'ProduceUnit', [
                'planetSeed' => $colonySeed,
                'type' => 'drone',
                'cost' => 100_000,
            ]));
            self::assertTrue($produce->success);
        }
    }

    public function testEngineIsRegistered(): void
    {
        $ids = array_map(static fn ($e) => $e->id(), $this->runtime->services->engineRegistry->all());
        self::assertContains('fleet-engine', $ids);
    }

    public function testFormFleetConsumesUnitsFromColony(): void
    {
        $this->seedColonyWithUnits(42, 3);

        $res = $this->dispatch(new Command('f1', 'FormFleet', [
            'fleetSeed' => 100,
            'ownerColonySeed' => 42,
            'type' => 'transport',
            'unitIndices' => [0, 1],
        ]));

        self::assertTrue($res->success);
        self::assertSame('FleetFormed', $res->events[0]->type);

        $fleet = $this->runtime->services->state->get('fleet.100');
        self::assertCount(2, $fleet['units']);
        self::assertSame('transport', $fleet['type']);

        // Из пула колонии изъяты выбранные 2 из 3 — остался 1.
        $production = $this->runtime->services->state->get('production.colony.42');
        self::assertCount(1, $production['units']);
    }

    public function testFormFleetRejectsUnknownType(): void
    {
        $this->seedColonyWithUnits(7, 1);

        $res = $this->dispatch(new Command('f2', 'FormFleet', [
            'fleetSeed' => 101,
            'ownerColonySeed' => 7,
            'type' => 'bogus',
            'unitIndices' => [0],
        ]));

        self::assertFalse($res->success);
    }

    public function testFormFleetRejectsMissingUnitIndex(): void
    {
        $this->seedColonyWithUnits(8, 1);

        $res = $this->dispatch(new Command('f3', 'FormFleet', [
            'fleetSeed' => 102,
            'ownerColonySeed' => 8,
            'type' => 'transport',
            'unitIndices' => [5],
        ]));

        self::assertFalse($res->success);
    }

    public function testFormFleetRejectsDuplicateIndex(): void
    {
        $this->seedColonyWithUnits(9, 2);

        $res = $this->dispatch(new Command('f4', 'FormFleet', [
            'fleetSeed' => 103,
            'ownerColonySeed' => 9,
            'type' => 'transport',
            'unitIndices' => [0, 0],
        ]));

        self::assertFalse($res->success);
    }

    public function testFormFleetRejectsUnknownColony(): void
    {
        $res = $this->dispatch(new Command('f5', 'FormFleet', [
            'fleetSeed' => 104,
            'ownerColonySeed' => 99999,
            'type' => 'transport',
            'unitIndices' => [0],
        ]));

        self::assertFalse($res->success);
        self::assertStringContainsString('has no produced units', $res->errorMessage);
    }

    public function testMoveFleetUpdatesCoordinatesAndClamps(): void
    {
        $this->seedColonyWithUnits(10, 1);

        $this->dispatch(new Command('f6', 'FormFleet', [
            'fleetSeed' => 105,
            'ownerColonySeed' => 10,
            'type' => 'exploration',
            'unitIndices' => [0],
        ]));

        // Сдвиг в допустимые координаты.
        $move = $this->dispatch(new Command('m1', 'MoveFleet', [
            'fleetSeed' => 105,
            'x' => 50_000,
            'y' => -30_000,
            'z' => 10_000,
        ]));
        self::assertTrue($move->success);
        self::assertSame('FleetMoved', $move->events[0]->type);

        $fleet = $this->runtime->services->state->get('fleet.105');
        self::assertSame(50_000, $fleet['x']);
        self::assertSame(-30_000, $fleet['y']);
        self::assertSame(10_000, $fleet['z']);

        // Выход за границы — кламп в MAX_COORD.
        $clamp = $this->dispatch(new Command('m2', 'MoveFleet', [
            'fleetSeed' => 105,
            'x' => 99_000_000,
            'y' => 99_000_000,
            'z' => 99_000_000,
        ]));
        self::assertTrue($clamp->success);

        $fleet = $this->runtime->services->state->get('fleet.105');
        self::assertSame(5_000_000, $fleet['x']);
        self::assertSame(5_000_000, $fleet['y']);
        self::assertSame(5_000_000, $fleet['z']);
    }

    public function testMoveFleetRejectsUnknownFleet(): void
    {
        $res = $this->dispatch(new Command('m3', 'MoveFleet', [
            'fleetSeed' => 424242,
            'x' => 1,
            'y' => 2,
            'z' => 3,
        ]));
        self::assertFalse($res->success);
    }

    public function testDisembarkRequiresPlanetAndProximity(): void
    {
        $this->seedColonyWithUnits(11, 2);

        $this->dispatch(new Command('f7', 'FormFleet', [
            'fleetSeed' => 106,
            'ownerColonySeed' => 11,
            'type' => 'strike',
            'unitIndices' => [0, 1],
        ]));

        // Планета ещё не заспавнена (зона UniverseEngine) -> отказ.
        $noPlanet = $this->dispatch(new Command('d0', 'DisembarkFleet', [
            'fleetSeed' => 106,
            'planetSeed' => 555,
        ]));
        self::assertFalse($noPlanet->success);
        self::assertStringContainsString('not spawned', $noPlanet->errorMessage);

        // Спавним планету рядом с началом координат (0,0,0).
        $spawn = $this->dispatch(new Command('sp1', 'SpawnPlanet', [
            'seed' => 555,
            'type' => 'terran',
            'radiusKm' => 6_371,
            'semiMajorAxisAuMilli' => 150_000_000_000,
            'eccentricityFixed' => 0,
            'inclinationFixed' => 0,
            'x' => 0,
            'y' => 0,
            'z' => 0,
        ]));
        self::assertTrue($spawn->success);

        // Флот всё ещё в (0,0,0) по умолчанию -> десант проходит.
        $close = $this->dispatch(new Command('d1', 'DisembarkFleet', [
            'fleetSeed' => 106,
            'planetSeed' => 555,
        ]));
        self::assertTrue($close->success);
        self::assertSame('FleetDisembarked', $close->events[0]->type);

        $fleet = $this->runtime->services->state->get('fleet.106');
        self::assertSame(555, $fleet['disembarked']['planetSeed']);
    }

    public function testDisembarkFailsWhenTooFar(): void
    {
        $this->seedColonyWithUnits(12, 1);

        $this->dispatch(new Command('f8', 'FormFleet', [
            'fleetSeed' => 107,
            'ownerColonySeed' => 12,
            'type' => 'transport',
            'unitIndices' => [0],
        ]));

        // Уводим флот далеко от начала координат.
        $this->dispatch(new Command('m4', 'MoveFleet', [
            'fleetSeed' => 107,
            'x' => 5_000_000,
            'y' => 5_000_000,
            'z' => 5_000_000,
        ]));

        $this->dispatch(new Command('sp2', 'SpawnPlanet', [
            'seed' => 777,
            'type' => 'terran',
            'radiusKm' => 6_371,
            'semiMajorAxisAuMilli' => 150_000_000_000,
            'eccentricityFixed' => 0,
            'inclinationFixed' => 0,
            'x' => 0,
            'y' => 0,
            'z' => 0,
        ]));

        $far = $this->dispatch(new Command('d2', 'DisembarkFleet', [
            'fleetSeed' => 107,
            'planetSeed' => 777,
        ]));
        self::assertFalse($far->success);
        self::assertStringContainsString('too far', $far->errorMessage);
    }

    public function testFormFleetRejectsDuplicateFleetSeed(): void
    {
        $this->seedColonyWithUnits(13, 2);

        $first = $this->dispatch(new Command('f9', 'FormFleet', [
            'fleetSeed' => 108,
            'ownerColonySeed' => 13,
            'type' => 'transport',
            'unitIndices' => [0],
        ]));
        self::assertTrue($first->success);

        $dup = $this->dispatch(new Command('f10', 'FormFleet', [
            'fleetSeed' => 108,
            'ownerColonySeed' => 13,
            'type' => 'transport',
            'unitIndices' => [1],
        ]));
        self::assertFalse($dup->success);
    }
}
