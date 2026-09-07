<?php

declare(strict_types=1);

// src/CoreEngine/Core/RuntimeStateStore.php

namespace Project\CoreEngine\Core;

use JsonException;
use RuntimeException;

/**
 * Лёгкое rolling-хранилище текущего состояния рантайма.
 *
 * Отличается от SnapshotStore: хранит НЕ историю тиков, а только «последнее
 * живое состояние» в одном фиксированном файле. Используется долгоживущим
 * рантаймом (persistent runtime) для восстановления State между HTTP-запросами
 * при per-request модели php -S, где каждый запрос — новый процесс.
 *
 * Запись атомарная (temp + rename). Чтение возвращает null, если файл отсутствует
 * (холодный старт).
 */
final class RuntimeStateStore
{
    /**
     * @param string $directory Директория хранения (обычно SNAPSHOT_DIR).
     * @param string $filename Имя файла rolling-состояния.
     */
    public function __construct(
        private readonly string $directory,
        private readonly string $filename = 'runtime_state.json'
    ) {
        $this->ensureDirectory($this->directory);
    }

    /**
     * @param array<string, mixed> $state
     */
    public function saveState(array $state): void
    {
        $path = $this->path();
        $payload = json_encode($state, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);

        $tempPath = $path . '.' . bin2hex(random_bytes(8)) . '.tmp';
        $written = file_put_contents($tempPath, $payload, LOCK_EX);

        if ($written === false) {
            throw new RuntimeException(sprintf('Failed to write runtime state: %s', $tempPath));
        }

        if (!rename($tempPath, $path)) {
            unlink($tempPath);
            throw new RuntimeException(sprintf('Failed to finalize runtime state: %s', $path));
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    public function loadState(): ?array
    {
        $path = $this->path();

        if (!is_file($path)) {
            return null;
        }

        $contents = file_get_contents($path);

        if ($contents === false) {
            throw new RuntimeException(sprintf('Failed to read runtime state: %s', $path));
        }

        if (trim($contents) === '') {
            return null;
        }

        try {
            /** @var array<string, mixed> $data */
            $data = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new RuntimeException(sprintf('Corrupted runtime state: %s', $exception->getMessage()));
        }

        return $data;
    }

    public function clear(): void
    {
        $path = $this->path();

        if (is_file($path)) {
            unlink($path);
        }
    }

    private function path(): string
    {
        return rtrim($this->directory, '/\\') . '/' . $this->filename;
    }

    private function ensureDirectory(string $directory): void
    {
        if (is_dir($directory)) {
            return;
        }

        if (!mkdir($directory, 0o777, true) && !is_dir($directory)) {
            throw new RuntimeException(sprintf('Runtime state directory is not writable: %s', $directory));
        }
    }
}
