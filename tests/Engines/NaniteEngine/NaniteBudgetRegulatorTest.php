<?php

declare(strict_types=1);

// tests/Engines/NaniteEngine/NaniteBudgetRegulatorTest.php

namespace Project\Tests\Engines\NaniteEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\Logging\NullLogger;
use Project\CoreEngine\Core\State;
use Project\CoreEngine\Core\TickContext;
use Project\CoreEngine\Core\EventBus;
use Project\CoreEngine\Contracts\DeterministicRandomInterface;
use Project\CoreEngine\Contracts\LoggerInterface;
use Project\Engines\NaniteEngine\Core\NaniteBudgetDirector;
use Project\Engines\NaniteEngine\Core\NaniteBudgetRegulator;
use Project\Engines\NaniteEngine\Core\Tiers\BillboardTierStrategy;
use Project\Engines\NaniteEngine\Core\Tiers\PointTierStrategy;
use Project\Engines\NaniteEngine\Core\Tiers\SurfaceTierStrategy;

final class NaniteBudgetRegulatorTest extends TestCase
{
    public function testTightensBudgetOnCeilingExceeded(): void
    {
        $state = new State();
        // Занятость слотов уперлась в жёсткий потолок (>= 95%).
        $state->set('nanite.snapshot', [
            'streamingBudgetUsed' => 250,   // при бюджете 256 -> occ ~0.98
            'simulationBudgetUsed' => 60,
        ]);
        $state->set('nanite.streamingBudget', 256);
        $state->set('nanite.simulationBudget', 64);

        $regulator = new NaniteBudgetRegulator($state, new NullLogger());
        $regulator->update($this->tick($state));

        $streaming = $state->get('nanite.streamingBudget');
        self::assertLessThan(256, $streaming);
    }

    public function testExpandsBudgetWhenUnderSoftLimit(): void
    {
        $state = new State();
        // Занятость низкая (< 70%) -> бюджет аккуратно расширяется.
        $state->set('nanite.snapshot', [
            'streamingBudgetUsed' => 10,
            'simulationBudgetUsed' => 5,
        ]);
        $state->set('nanite.streamingBudget', 100);
        $state->set('nanite.simulationBudget', 50);

        $regulator = new NaniteBudgetRegulator($state, new NullLogger());
        $regulator->update($this->tick($state));

        self::assertGreaterThan(100, $state->get('nanite.streamingBudget'));
    }

    private function tick(State $state): TickContext
    {
        return new TickContext(
            1,
            $state,
            new EventBus(new NullLogger()),
            // DeterministicRandom не нужен здесь, но контракт требует.
            $this->random(),
            new NullLogger()
        );
    }

    private function random(): DeterministicRandomInterface
    {
        return new class implements DeterministicRandomInterface {
            public function setTick(int $tick): void {}
            public function nextInt(int $min, int $max, string $scope = 'default'): int { return $min; }
            public function nextFixed(string $scope = 'default', int $scale = 1_000_000): int { return 0; }
            public function chance(int $probability, string $scope = 'default', int $scale = 1_000_000): bool { return false; }
        };
    }
}
