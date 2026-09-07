<?php

declare(strict_types=1);

// tests/Engines/NaniteEngine/NaniteEngineIntegrationTest.php
//
// Проверяет, что NaniteEngine грузится штатным CoreEngineBootstrap-ом,
// регистрирует команду EvaluateNaniteFrame и отрабатывает через CommandBus
// рядом с UniverseEngine (доказывает, что ядро домен-независимо и не конфликтует).

namespace Project\Tests\Engines\NaniteEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandBus;
use Project\CoreEngine\Core\CoreEngineBootstrap;
use Project\CoreEngine\Core\CoreEngineRuntime;
use Project\CoreEngine\Core\Logging\NullLogger;
use Project\CoreEngine\Core\State;

final class NaniteEngineIntegrationTest extends TestCase
{
    private CoreEngineRuntime $runtime;
    private CommandBus $commandBus;
    private State $state;

    protected function setUp(): void
    {
        $this->runtime = (new CoreEngineBootstrap(new NullLogger()))
            ->createRuntime(
                dirname(__DIR__, 3) . '/src/Engines',
                'nanite-test-seed'
            );

        $this->commandBus = $this->runtime->services->commandBus;
        $this->state = $this->runtime->services->state;
    }

    public function testEngineLoaded(): void
    {
        self::assertTrue(
            $this->runtime->services->engineRegistry->has('nanite-engine')
        );
    }

    public function testCommandRegisteredAndEvaluates(): void
    {
        $command = new Command('integ-1', 'EvaluateNaniteFrame', [
            'entities' => [
                ['id' => 'star', 'screenPx' => 5000, 'baseRadius' => 1000],
                ['id' => 'far', 'screenPx' => 2, 'baseRadius' => 1000],
            ],
            'focusId' => 'star',
        ]);

        $result = $this->commandBus->dispatch($command, $this->state);

        self::assertTrue($result->success);
        self::assertNotNull($this->state->get('nanite.snapshot'));
        self::assertSame('surface', $this->state->get('nanite.tiers')['star']);
        self::assertSame('point', $this->state->get('nanite.tiers')['far']);
        // Оба тела в кадре (px > 0) -> оба застримлены.
        self::assertSame(2, $this->state->get('nanite.snapshot')['streamingBudgetUsed']);
    }

    public function testUnknownCommandStillRejected(): void
    {
        $command = new Command('integ-2', 'NonExistent', []);
        $result = $this->commandBus->dispatch($command, $this->state);

        self::assertFalse($result->success);
    }
}
