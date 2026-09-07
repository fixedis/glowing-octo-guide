<?php

declare(strict_types=1);

// tests/CoreEngine/PersistentRuntimeTest.php

namespace Project\Tests\CoreEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CoreEngineBootstrap;
use Project\CoreEngine\Core\CoreEngineRuntime;
use Project\CoreEngine\Core\Logging\NullLogger;
use Project\CoreEngine\Core\RuntimeStateStore;

/**
 * Проверяет модель persistent runtime: состояние (tick + State) переживает
 * между "запросами" благодаря RuntimeStateStore + Kernel::restoreFromState.
 *
 * Имитирует per-request модель php -S: каждый "запрос" = новый рантайм,
 * но rolling-state подхватывается из общего хранилища.
 */
final class PersistentRuntimeTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        $this->dir = sys_get_temp_dir() . '/coreengine_pt_' . bin2hex(random_bytes(6));
    }

    protected function tearDown(): void
    {
        $store = new RuntimeStateStore($this->dir);
        $store->clear();
        @rmdir($this->dir);
    }

    private function newRuntime(): CoreEngineRuntime
    {
        $bootstrap = new CoreEngineBootstrap(new NullLogger());
        return $bootstrap->createRuntime(__DIR__ . '/../../src/Engines', 'persistent-test');
    }

    private function dispatch(CoreEngineRuntime $rt, string $type, array $payload): void
    {
        $rt->services->commandBus->dispatch(
            new Command('c_' . bin2hex(random_bytes(4)), $type, $payload),
            $rt->services->state
        );
    }

    public function testStateSurvivesAcrossRuntimes(): void
    {
        $store = new RuntimeStateStore($this->dir);

        // "Запрос 1": регистрируем колонию, выдаём ресурсы, шаг тика.
        $rt1 = $this->newRuntime();
        $this->dispatch($rt1, 'RegisterColonyEconomy', ['planetSeed' => 42, 'baseYield' => 500000]);
        $this->dispatch($rt1, 'AdminGrantResources', ['planetSeed' => 42, 'amount' => 777000]);
        $rt1->kernel->step();

        $saved = $rt1->services->state->all();
        $saved['tick'] = $rt1->kernel->currentTick();
        $store->saveState($saved);

        $tickAfterReq1 = $rt1->kernel->currentTick();
        $storedAfterReq1 = $rt1->services->state->get('economy.colony.42')['stored'];

        // "Запрос 2": новый рантайм, восстанавливаем из rolling-state.
        $rt2 = $this->newRuntime();
        $restored = $store->loadState();
        self::assertNotNull($restored, 'Rolling-state должен существовать.');
        $restoredTick = (int) ($restored['tick'] ?? 0);
        unset($restored['tick']);
        $rt2->kernel->restoreFromState($restoredTick, $restored);

        // Тик и накопленные ресурсы пережили "перезапуск".
        self::assertSame($tickAfterReq1, $rt2->kernel->currentTick());
        self::assertSame($storedAfterReq1, $rt2->services->state->get('economy.colony.42')['stored']);

        // Можно продолжить симуляцию с того же места.
        $rt2->kernel->step();
        self::assertSame($tickAfterReq1 + 1, $rt2->kernel->currentTick());
    }

    public function testGodModePersistsAcrossRuntimes(): void
    {
        $store = new RuntimeStateStore($this->dir);

        // "Запрос 1": включаем godmode.
        $rt1 = $this->newRuntime();
        $this->dispatch($rt1, 'AdminSetGodMode', ['enabled' => true]);
        $saved = $rt1->services->state->all();
        $saved['tick'] = $rt1->kernel->currentTick();
        $store->saveState($saved);

        // "Запрос 2": godmode должен быть активен (спавн вне границ пройдёт).
        $rt2 = $this->newRuntime();
        $restored = $store->loadState();
        $restoredTick = (int) ($restored['tick'] ?? 0);
        unset($restored['tick']);
        $rt2->kernel->restoreFromState($restoredTick, $restored);

        self::assertTrue((bool) $rt2->services->state->get('admin.godmode'));
        $spawn = $rt2->services->commandBus->dispatch(
            new Command('spawn_1', 'SpawnPlanet', [
                'seed' => 999, 'type' => 'terran', 'radiusKm' => 6000,
                'semiMajorAxisAuMilli' => 100000, 'eccentricityFixed' => 100000,
                'inclinationFixed' => 100000, 'x' => 9999999, 'y' => 0, 'z' => 0,
            ]),
            $rt2->services->state
        );
        self::assertTrue($spawn->success, 'Godmode из rolling-state должен разрешить спавн вне границ.');
    }

    public function testColdStartWithoutState(): void
    {
        $store = new RuntimeStateStore($this->dir);
        self::assertNull($store->loadState(), 'Холодный старт: rolling-state отсутствует.');
    }
}
