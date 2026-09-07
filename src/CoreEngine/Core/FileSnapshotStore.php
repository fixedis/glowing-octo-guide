<?php

declare(strict_types=1);

// src/CoreEngine/Core/FileSnapshotStore.php

namespace Project\CoreEngine\Core;

use InvalidArgumentException;
use LogicException;
use Project\CoreEngine\Contracts\SnapshotStoreInterface;
use RuntimeException;

/**
 * Файловое хранилище снапшотов.
 *
 * Каждый снапшот сохраняется как отдельный JSON-файл в указанной директории.
 * Формат имени: snapshot_{tick}.json.
 *
 * Используется для персистентного Save/Load между перезапусками ядра.
 * Для выбора этого хранилища вместо in-memory задайте env SNAPSHOT_DIR.
 */
final class FileSnapshotStore implements SnapshotStoreInterface
{
    /**
     * @param string $directory Абсолютный путь к директории хранения.
     */
    public function __construct(
        private readonly string $directory
    ) {
        $this->ensureDirectory($this->directory);
    }

    public function save(Snapshot $snapshot): void
    {
        if ($snapshot->tick < 0) {
            throw new InvalidArgumentException(sprintf(
                'Snapshot tick cannot be negative. Tick: %d',
                $snapshot->tick
            ));
        }

        $existing = $this->findByTick($snapshot->tick);

        if ($existing !== null && $existing->hash !== $snapshot->hash) {
            throw new LogicException(sprintf(
                'Snapshot for tick %d already exists with a different hash.',
                $snapshot->tick
            ));
        }

        if ($existing !== null) {
            return;
        }

        $path = $this->pathForTick($snapshot->tick);
        $payload = json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);

        // Атомарная запись: сначала temp-файл, затем rename.
        $tempPath = $path . '.' . bin2hex(random_bytes(8)) . '.tmp';
        $written = file_put_contents($tempPath, $payload, LOCK_EX);

        if ($written === false) {
            throw new RuntimeException(sprintf('Failed to write snapshot file: %s', $tempPath));
        }

        if (!rename($tempPath, $path)) {
            unlink($tempPath);
            throw new RuntimeException(sprintf('Failed to finalize snapshot file: %s', $path));
        }
    }

    public function findByTick(int $tick): ?Snapshot
    {
        $path = $this->pathForTick($tick);

        if (!is_file($path)) {
            return null;
        }

        $contents = file_get_contents($path);

        if ($contents === false) {
            throw new RuntimeException(sprintf('Failed to read snapshot file: %s', $path));
        }

        /** @var array{tick:int,state:mixed,hash:string} $data */
        $data = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);

        return new Snapshot($data['tick'], $data['state'], $data['hash']);
    }

    public function latest(): ?Snapshot
    {
        $all = $this->all();

        if ($all === []) {
            return null;
        }

        return $all[array_key_last($all)];
    }

    /**
     * @return list<Snapshot>
     */
    public function all(): array
    {
        $files = glob($this->directory . '/snapshot_*.json') ?: [];
        $snapshots = [];

        foreach ($files as $file) {
            if (!is_file($file)) {
                continue;
            }

            $contents = file_get_contents($file);

            if ($contents === false) {
                continue;
            }

            /** @var array{tick:int,state:mixed,hash:string} $data */
            $data = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
            $snapshots[$data['tick']] = new Snapshot($data['tick'], $data['state'], $data['hash']);
        }

        ksort($snapshots, SORT_NUMERIC);

        return array_values($snapshots);
    }

    public function clear(): void
    {
        $files = glob($this->directory . '/snapshot_*.json') ?: [];

        foreach ($files as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }
    }

    private function pathForTick(int $tick): string
    {
        return $this->directory . '/snapshot_' . $tick . '.json';
    }

    private function ensureDirectory(string $directory): void
    {
        if (is_dir($directory)) {
            return;
        }

        if (!mkdir($directory, 0o777, true) && !is_dir($directory)) {
            throw new RuntimeException(sprintf('Snapshot directory is not writable: %s', $directory));
        }
    }
}
