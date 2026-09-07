<?php

declare(strict_types=1);

// src/CoreEngine/Core/SnapshotManager.php

namespace Project\CoreEngine\Core;

use InvalidArgumentException;
use JsonException;
use Project\CoreEngine\Contracts\LoggerInterface;
use Project\CoreEngine\Contracts\SnapshotStoreInterface;
use Project\CoreEngine\Contracts\StateInterface;
use RuntimeException;

final class SnapshotManager
{
    public function __construct(
        private readonly SnapshotStoreInterface $store,
        private readonly LoggerInterface $logger
    ) {
    }

    /**
     * @param array<string, mixed> $state
     */
    public function createFromState(int $tick, array $state): Snapshot
    {
        if ($tick < 0) {
            $this->invalidArgument('Snapshot tick cannot be negative.', [
                'tick' => $tick,
            ]);
        }

        $hash = $this->hashState($state);

        $snapshot = new Snapshot($tick, $state, $hash);

        $this->logger->debug('Snapshot created.', [
            'tick' => $tick,
            'hash' => $hash,
        ]);

        return $snapshot;
    }

    public function persist(Snapshot $snapshot): void
    {
        $this->store->save($snapshot);

        $this->logger->info('Snapshot persisted.', [
            'tick' => $snapshot->tick,
            'hash' => $snapshot->hash,
        ]);
    }

    public function latest(): ?Snapshot
    {
        return $this->store->latest();
    }

    public function findByTick(int $tick): ?Snapshot
    {
        return $this->store->findByTick($tick);
    }

    public function restoreIntoState(Snapshot $snapshot, StateInterface $state): void
    {
        $expectedHash = $this->hashState($snapshot->state);

        if ($expectedHash !== $snapshot->hash) {
            $this->runtimeError('Snapshot hash mismatch.', [
                'tick' => $snapshot->tick,
                'expected_hash' => $expectedHash,
                'actual_hash' => $snapshot->hash,
            ]);
        }

        foreach (array_keys($state->all()) as $key) {
            $state->remove((string) $key);
        }

        foreach ($snapshot->state as $key => $value) {
            $state->set((string) $key, $value);
        }

        $this->logger->info('Snapshot restored into state.', [
            'tick' => $snapshot->tick,
            'hash' => $snapshot->hash,
        ]);
    }

    /**
     * @param array<string, mixed> $state
     */
    public function hashState(array $state): string
    {
        try {
            $json = json_encode($this->normalizeForHash($state), JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            $this->runtimeError('State is not serializable.', [
                'error' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
            ]);
        }

        return hash('sha256', $json);
    }

    /**
     * Рекурсивная нормализация состояния для детерминированного хэша.
     *
     * Сортирует ключи только у ассоциативных массивов (строковые/смешанные
     * ключи), чтобы порядок вставки не влиял на хэш. Списки (последовательные
     * целочисленные ключи 0..n) сохраняют порядок как значимые данные
     * (например, массив сгенерированных галактик).
     *
     * @param array<string|int, mixed> $data
     * @return array<string|int, mixed>
     */
    private function normalizeForHash(array $data): array
    {
        $isList = true;
        $expectedIndex = 0;

        foreach ($data as $key => $value) {
            if ($key !== $expectedIndex) {
                $isList = false;
                break;
            }
            $expectedIndex++;
        }

        $normalized = [];

        foreach ($data as $key => $value) {
            $normalized[$key] = is_array($value)
                ? $this->normalizeForHash($value)
                : $value;
        }

        if (!$isList) {
            ksort($normalized, SORT_STRING);
        }

        return $normalized;
    }

    /**
     * @param array<string, mixed> $context
     */
    private function invalidArgument(string $message, array $context): never
    {
        $this->logger->error($message, $context);

        throw new InvalidArgumentException($message);
    }

    /**
     * @param array<string, mixed> $context
     */
    private function runtimeError(string $message, array $context): never
    {
        $this->logger->error($message, $context);

        throw new RuntimeException($message);
    }
}
