<?php

declare(strict_types=1);

// src/CoreEngine/Core/ReplayManager.php

namespace Project\CoreEngine\Core;

use JsonException;
use RuntimeException;

/**
 * Менеджер записи и воспроизведения симуляции (replay).
 *
 * Работает как декоратор над Kernel: принимает на себя ввод команд,
 * проксирует их в Kernel и сохраняет пошагово (tick + команды + хэш снапшота).
 *
 * При воспроизведении подаёт те же команды в тот же порядке и сверяет
 * хэш каждого снапшота с записанным — выступая оракулом детерминизма.
 */
final class ReplayManager
{
    /**
     * @var list<Command>
     */
    private array $pendingCommands = [];

    private bool $recording = false;

    public function __construct(
        private readonly Kernel $kernel,
        private readonly string $filePath
    ) {
    }

    /**
     * Поставить команду в очередь текущего тика (вместо Kernel::addCommand).
     */
    public function enqueue(Command $command): void
    {
        $this->pendingCommands[] = $command;
        $this->kernel->addCommand($command);
    }

    /**
     * Начать запись сессии в файл (перезаписывает существующий).
     */
    public function startRecording(): void
    {
        $this->recording = true;
        $dir = dirname($this->filePath);

        if (!is_dir($dir) && !mkdir($dir, 0o777, true) && !is_dir($dir)) {
            throw new RuntimeException(sprintf('Replay directory is not writable: %s', $dir));
        }

        if (file_put_contents($this->filePath, '') === false) {
            throw new RuntimeException(sprintf('Cannot init replay file: %s', $this->filePath));
        }
    }

    /**
     * Выполнить один тик и (при записи) сохранить его.
     */
    public function step(): Snapshot
    {
        $tick = $this->kernel->currentTick() + 1;
        $snapshot = $this->kernel->runTick();

        if ($this->recording) {
            $recorded = new RecordedTick($tick, $this->pendingCommands, $snapshot->hash);
            $this->appendRecord($recorded);
        }

        $this->pendingCommands = [];

        return $snapshot;
    }

    /**
     * Остановить запись.
     */
    public function stopRecording(): void
    {
        $this->recording = false;
    }

    /**
     * Воспроизвести записанную сессию.
     *
     * @return list<string> Список расхождений (пустой = детерминизм сохранён).
     */
    public function replay(): array
    {
        $records = $this->loadRecords();

        if ($records === []) {
            throw new RuntimeException(sprintf('Replay file is empty or missing: %s', $this->filePath));
        }

        $divergences = [];

        foreach ($records as $record) {
            $expectedTick = $record->tick;

            foreach ($record->commands as $command) {
                $this->kernel->addCommand($command);
            }

            $snapshot = $this->kernel->runTick();

            if ($snapshot->tick !== $expectedTick) {
                $divergences[] = sprintf(
                    'Tick mismatch: expected %d, got %d',
                    $expectedTick,
                    $snapshot->tick
                );
                continue;
            }

            if ($snapshot->hash !== $record->hash) {
                $divergences[] = sprintf(
                    'Hash divergence at tick %d: recorded %s, replayed %s',
                    $expectedTick,
                    $record->hash,
                    $snapshot->hash
                );
            }
        }

        return $divergences;
    }

    /**
     * @return list<RecordedTick>
     */
    private function loadRecords(): array
    {
        if (!is_file($this->filePath)) {
            return [];
        }

        $contents = file_get_contents($this->filePath);

        if ($contents === false) {
            throw new RuntimeException(sprintf('Cannot read replay file: %s', $this->filePath));
        }

        $records = [];

        foreach (explode("\n", $contents) as $line) {
            $line = trim($line);

            if ($line === '') {
                continue;
            }

            /** @var array{tick:int,commands:list<array>,hash:string} $data */
            $data = json_decode($line, true, 512, JSON_THROW_ON_ERROR);

            $commands = [];

            foreach ($data['commands'] as $cmd) {
                $commands[] = new Command(
                    $cmd['id'],
                    $cmd['type'],
                    $cmd['payload'] ?? [],
                    $cmd['actorId'] ?? null,
                    $cmd['targetId'] ?? null,
                    $cmd['version'] ?? '1.0.0'
                );
            }

            $records[] = new RecordedTick($data['tick'], $commands, $data['hash']);
        }

        return $records;
    }

    private function appendRecord(RecordedTick $record): void
    {
        try {
            $line = json_encode($record, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        } catch (JsonException $exception) {
            throw new RuntimeException('Cannot serialize replay record: ' . $exception->getMessage());
        }

        if (file_put_contents($this->filePath, $line . "\n", FILE_APPEND | LOCK_EX) === false) {
            throw new RuntimeException(sprintf('Cannot append replay record: %s', $this->filePath));
        }
    }
}
