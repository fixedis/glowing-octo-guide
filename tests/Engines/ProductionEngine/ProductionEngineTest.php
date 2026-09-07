<?php

declare(strict_types=1);

// tests/Engines/ProductionEngine/ProductionEngineTest.php

namespace Project\Tests\Engines\ProductionEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CoreEngineBootstrap;
use Project\CoreEngine\Core\CoreEngineRuntime;
use Project\CoreEngine\Core\Logging\NullLogger;

/**
 * Интеграционные тесты ProductionEngine.
 *
 * Проверяют: регистрацию движка, списание ресурсов из economy.colony.*.stored,
 * детерминизм стоимости (базовая из ProductionBlueprint либо override из команды),
 * отказ при нехватке ресурсов / незарегистрированной колонии / неверном типе.
 */
final class ProductionEngineTest extends TestCase
{
    private CoreEngineRuntime $runtime;

    protected function setUp(): void
    {
        $bootstrap = new CoreEngineBootstrap(new NullLogger());
        $this->runtime = $bootstrap->createRuntime(__DIR__ . '/../../../src/Engines', 'production-test');
    }

    private function dispatch(Command $command): \Project\CoreEngine\Core\CommandResult
    {
        return $this->runtime->services->commandBus->dispatch($command, $this->runtime->services->state);
    }

    /**
     * Регистрирует колонию с заданным доходом и прокручивает тики,
     * накапливая stored (без сбора — CollectResources трогать не будем).
     */
    private function seedColony(int $seed, int $baseYield, int $ticks): void
    {
        $res = $this->dispatch(new Command('reg-' . $seed, 'RegisterColonyEconomy', [
            'planetSeed' => $seed,
            'baseYield' => $baseYield,
        ]));
        self::assertTrue($res->success, 'RegisterColonyEconomy failed: ' . $res->errorMessage);

        for ($i = 0; $i < $ticks; $i++) {
            $this->runtime->kernel->runTick();
        }
    }

    public function testEngineIsRegistered(): void
    {
        $ids = array_map(static fn ($e) => $e->id(), $this->runtime->services->engineRegistry->all());
        self::assertContains('production-engine', $ids);
    }

    public function testProduceBuildingSpendsResourcesAndStoresBuilding(): void
    {
        // 1 тик дохода 1_000_000 -> stored = 1_000_000.
        $this->seedColony(42, 1_000_000, 1);

        $res = $this->dispatch(new Command('b1', 'ProduceBuilding', [
            'planetSeed' => 42,
            'type' => 'habitat',
            'cost' => 500_000,
        ]));

        self::assertTrue($res->success);
        self::assertCount(1, $res->events);
        self::assertSame('BuildingProduced', $res->events[0]->type);

        // stored уменьшился на стоимость.
        $colony = $this->runtime->services->state->get('economy.colony.42');
        self::assertSame(500_000, $colony['stored']);

        // постройка записана в production.colony.42.buildings.
        $production = $this->runtime->services->state->get('production.colony.42');
        self::assertCount(1, $production['buildings']);
        self::assertSame('habitat', $production['buildings'][0]['type']);
        self::assertSame(500_000, $production['buildings'][0]['cost']);
    }

    public function testProduceUnitSpendsResourcesAndStoresUnit(): void
    {
        $this->seedColony(7, 1_000_000, 1);

        $res = $this->dispatch(new Command('u1', 'ProduceUnit', [
            'planetSeed' => 7,
            'type' => 'drone',
            'cost' => 300_000,
        ]));

        self::assertTrue($res->success);
        self::assertSame('UnitProduced', $res->events[0]->type);

        $colony = $this->runtime->services->state->get('economy.colony.7');
        self::assertSame(700_000, $colony['stored']);

        $production = $this->runtime->services->state->get('production.colony.7');
        self::assertCount(1, $production['units']);
        self::assertSame('drone', $production['units'][0]['type']);
        self::assertSame(300_000, $production['units'][0]['cost']);
    }

    public function testProduceUsesBaseCostWhenNotOverridden(): void
    {
        // habitat базовая стоимость = 500_000 (см. ProductionBlueprint).
        $this->seedColony(99, 1_000_000, 1);

        $res = $this->dispatch(new Command('b2', 'ProduceBuilding', [
            'planetSeed' => 99,
            'type' => 'habitat',
        ]));

        self::assertTrue($res->success);

        $colony = $this->runtime->services->state->get('economy.colony.99');
        self::assertSame(500_000, $colony['stored']);
    }

    public function testProduceFailsWhenNotEnoughResources(): void
    {
        // Доход 100_000 за тик -> stored = 100_000, а habitat стоит 500_000.
        $this->seedColony(5, 100_000, 1);

        $res = $this->dispatch(new Command('b3', 'ProduceBuilding', [
            'planetSeed' => 5,
            'type' => 'habitat',
        ]));

        self::assertFalse($res->success);
        self::assertStringContainsString('Not enough resources', $res->errorMessage);

        // stored не изменился.
        $colony = $this->runtime->services->state->get('economy.colony.5');
        self::assertSame(100_000, $colony['stored']);

        // ничего не произведено.
        self::assertFalse($this->runtime->services->state->has('production.colony.5'));
    }

    public function testProduceFailsWhenColonyNotRegistered(): void
    {
        $res = $this->dispatch(new Command('b4', 'ProduceBuilding', [
            'planetSeed' => 12345,
            'type' => 'habitat',
        ]));

        self::assertFalse($res->success);
        self::assertStringContainsString('not registered in economy', $res->errorMessage);
    }

    public function testProduceFailsOnInvalidBuildingType(): void
    {
        $this->seedColony(8, 1_000_000, 1);

        $res = $this->dispatch(new Command('b5', 'ProduceBuilding', [
            'planetSeed' => 8,
            'type' => 'not_a_building',
        ]));

        self::assertFalse($res->success);
    }

    public function testProduceUnitFailsOnInvalidUnitType(): void
    {
        $this->seedColony(9, 1_000_000, 1);

        $res = $this->dispatch(new Command('u2', 'ProduceUnit', [
            'planetSeed' => 9,
            'type' => 'habitat',
        ]));

        self::assertFalse($res->success);
    }

    public function testProduceAccumulatesMultipleBuildings(): void
    {
        $this->seedColony(3, 2_000_000, 1); // stored = 2_000_000

        $first = $this->dispatch(new Command('b6', 'ProduceBuilding', [
            'planetSeed' => 3,
            'type' => 'habitat',
            'cost' => 500_000,
        ]));
        self::assertTrue($first->success);

        $second = $this->dispatch(new Command('b7', 'ProduceBuilding', [
            'planetSeed' => 3,
            'type' => 'factory',
            'cost' => 1_200_000,
        ]));
        self::assertTrue($second->success);

        $colony = $this->runtime->services->state->get('economy.colony.3');
        self::assertSame(300_000, $colony['stored']);

        $production = $this->runtime->services->state->get('production.colony.3');
        self::assertCount(2, $production['buildings']);
        self::assertSame('habitat', $production['buildings'][0]['type']);
        self::assertSame('factory', $production['buildings'][1]['type']);
    }
}
