<?php

declare(strict_types=1);

// src/CoreEngine/Core/Kernel.php

namespace Project\CoreEngine\Core;

use Project\CoreEngine\Contracts\DeterministicRandomInterface;
use Project\CoreEngine\Contracts\LoggerInterface;
use Project\CoreEngine\Contracts\StateInterface;

final class Kernel
{
    /**
     * @var list<Command>
     */
    private array $commandQueue = [];

    private int $tick = 0;

    private bool $paused = false;

    private int $speed = 1;

    private const MIN_SPEED = 1;
    private const MAX_SPEED = 16;

    public function __construct(
        private readonly StateInterface $state,
        private readonly CommandBus $commandBus,
        private readonly EventBus $eventBus,
        private readonly EngineRegistry $engineRegistry,
        private readonly SystemPipeline $systemPipeline,
        private readonly DeterministicRandomInterface $random,
        private readonly SnapshotManager $snapshots,
        private readonly LoggerInterface $logger
    ) {
    }

    public function boot(): void
    {
        $this->logger->info('CoreEngine kernel boot started.');

        $this->engineRegistry->bootAll();

        $this->state->set('tick', 0);
        $this->random->setTick(0);

        $this->logger->info('CoreEngine kernel boot completed.');
    }

    public function shutdown(): void
    {
        $this->logger->info('CoreEngine kernel shutdown started.');

        $this->engineRegistry->shutdownAll();

        $this->logger->info('CoreEngine kernel shutdown completed.');
    }

    public function addCommand(Command $command): void
    {
        $this->commandQueue[] = $command;

        $this->logger->debug('Command queued.', [
            'command_id' => $command->id,
            'command_type' => $command->type,
            'queue_size' => count($this->commandQueue),
        ]);
    }

    public function runTick(): Snapshot
    {
        $this->tick++;
        $this->state->set('tick', $this->tick);
        $this->random->setTick($this->tick);

        $this->logger->info('Tick started.', [
            'tick' => $this->tick,
        ]);

        $this->eventBus->publish(new Event(
            sprintf('tick_started_%d', $this->tick),
            'TickStarted',
            [
                'tick' => $this->tick,
            ],
            $this->tick
        ));

        $commands = $this->commandQueue;
        $this->commandQueue = [];

        $failedCommands = 0;

        foreach ($commands as $command) {
            $result = $this->commandBus->dispatch($command, $this->state);

            if (!$result->success) {
                $failedCommands++;

                $this->eventBus->publish(new Event(
                    sprintf('command_rejected_%s_tick_%d', $command->id, $this->tick),
                    'CommandRejected',
                    [
                        'command_id' => $command->id,
                        'command_type' => $command->type,
                        'error' => $result->errorMessage,
                    ],
                    $this->tick
                ));
            }
        }

        $tickContext = new TickContext(
            $this->tick,
            $this->state,
            $this->eventBus,
            random: $this->random,
            logger: $this->logger
        );

        $this->systemPipeline->run($tickContext);

        $this->eventBus->publish(new Event(
            sprintf('tick_ended_%d', $this->tick),
            'TickEnded',
            [
                'tick' => $this->tick,
                'commands_count' => count($commands),
                'failed_commands_count' => $failedCommands,
            ],
            $this->tick
        ));

        $snapshot = $this->snapshots->createFromState($this->tick, $this->state->all());
        $this->snapshots->persist($snapshot);

        $this->logger->info('Tick completed.', [
            'tick' => $this->tick,
            'commands_count' => count($commands),
            'failed_commands_count' => $failedCommands,
            'snapshot_hash' => $snapshot->hash,
        ]);

        return $snapshot;
    }

    public function currentTick(): int
    {
        return $this->tick;
    }

    public function pause(): void
    {
        $this->paused = true;

        $this->logger->info('Kernel paused.', [
            'tick' => $this->tick,
        ]);
    }

    public function resume(): void
    {
        $this->paused = false;

        $this->logger->info('Kernel resumed.', [
            'tick' => $this->tick,
        ]);
    }

    public function isPaused(): bool
    {
        return $this->paused;
    }

    public function setSpeed(int $speed): void
    {
        if ($speed < self::MIN_SPEED || $speed > self::MAX_SPEED) {
            throw new \InvalidArgumentException(sprintf(
                'Kernel speed must be between %d and %d. Got: %d',
                self::MIN_SPEED,
                self::MAX_SPEED,
                $speed
            ));
        }

        $this->speed = $speed;

        $this->logger->info('Kernel speed changed.', [
            'speed' => $speed,
        ]);
    }

    public function getSpeed(): int
    {
        return $this->speed;
    }

    /**
     * Выполняет один тик вручную (независимо от паузы).
     *
     * Полезно для отладки и админки: шаг тика при остановленной симуляции.
     */
    public function step(): Snapshot
    {
        return $this->runTick();
    }

    /**
     * Восстанавливает состояние ядра из ранее сохранённого снапшота/state.
     *
     * Не перезапускает движки (bootAll уже был). Позволяет долгоживущему
     * рантайму «подхватить» накопленный тик и State между HTTP-запросами
     * при per-request модели (php -S создаёт новый процесс на запрос).
     *
     * @param array<string, mixed> $state
     */
    public function restoreFromState(int $tick, array $state): void
    {
        if ($tick < 0) {
            throw new \InvalidArgumentException(sprintf('Restore tick cannot be negative. Got: %d', $tick));
        }

        $this->tick = $tick;
        $this->state->set('tick', $tick);
        $this->random->setTick($tick);

        // Полная перезапись State (аналог SnapshotManager::restoreIntoState).
        foreach (array_keys($this->state->all()) as $key) {
            $this->state->remove((string) $key);
        }

        foreach ($state as $key => $value) {
            $this->state->set((string) $key, $value);
        }

        $this->logger->info('Kernel state restored.', [
            'tick' => $tick,
        ]);
    }
}
