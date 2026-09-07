<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Core/Colony/FileBuildingDeltaStore.php

namespace Project\Engines\UniverseEngine\Core\Colony;

use JsonException;
use Project\Engines\UniverseEngine\Contracts\BuildingDeltaStoreInterface;
use RuntimeException;

/**
 * Файловая персистентность дельт построек.
 * Один JSON-файл на планету: planet_{seed}.json.
 */
final class FileBuildingDeltaStore implements BuildingDeltaStoreInterface
{
    /**
     * @var array<int, array<string, string>>
     */
    private array $cache = [];

    public function __construct(
        private readonly string $storagePath
    ) {
    }

    public function getDelta(int $planetSeed, int $face, int $x, int $y): ?string
    {
        $deltas = $this->load($planetSeed);

        return $deltas[$this->key($face, $x, $y)] ?? null;
    }

    public function place(int $planetSeed, int $face, int $x, int $y, string $buildingType): void
    {
        $type = trim($buildingType);

        if ($type === '') {
            throw new RuntimeException(sprintf(
                'Building type cannot be empty. Planet: %d, cell: %d/%d/%d.',
                $planetSeed,
                $face,
                $x,
                $y
            ));
        }

        $deltas = $this->load($planetSeed);
        $deltas[$this->key($face, $x, $y)] = $type;

        $this->save($planetSeed, $deltas);
    }

    public function demolish(int $planetSeed, int $face, int $x, int $y): void
    {
        $deltas = $this->load($planetSeed);
        $deltas[$this->key($face, $x, $y)] = self::REMOVED;

        $this->save($planetSeed, $deltas);
    }

    /**
     * @return array<string, string>
     */
    private function load(int $planetSeed): array
    {
        if (isset($this->cache[$planetSeed])) {
            return $this->cache[$planetSeed];
        }

        $path = $this->filePath($planetSeed);

        if (!is_file($path)) {
            return $this->cache[$planetSeed] = [];
        }

        $json = file_get_contents($path);

        if ($json === false) {
            throw new RuntimeException(sprintf(
                'Unable to read delta file: %s',
                $path
            ));
        }

        try {
            $data = json_decode($json, true, 16, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new RuntimeException(sprintf(
                'Corrupted delta file: %s',
                $path
            ), 0, $exception);
        }

        if (!is_array($data)) {
            throw new RuntimeException(sprintf(
                'Invalid delta file structure: %s',
                $path
            ));
        }

        foreach ($data as $key => $value) {
            if (!is_string($key) || !is_string($value)) {
                throw new RuntimeException(sprintf(
                    'Invalid delta entry in file: %s',
                    $path
                ));
            }
        }

        return $this->cache[$planetSeed] = $data;
    }

    /**
     * @param array<string, string> $deltas
     */
    private function save(int $planetSeed, array $deltas): void
    {
        $this->cache[$planetSeed] = $deltas;

        $path = $this->filePath($planetSeed);
        $dir = dirname($path);

        if (!is_dir($dir) && !mkdir($dir, 0777, true) && !is_dir($dir)) {
            throw new RuntimeException(sprintf(
                'Unable to create storage directory: %s',
                $dir
            ));
        }

        try {
            $json = json_encode($deltas, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        } catch (JsonException $exception) {
            throw new RuntimeException(sprintf(
                'Unable to encode deltas for planet %d.',
                $planetSeed
            ), 0, $exception);
        }

        if (file_put_contents($path, $json, LOCK_EX) === false) {
            throw new RuntimeException(sprintf(
                'Unable to write delta file: %s',
                $path
            ));
        }
    }

    private function filePath(int $planetSeed): string
    {
        return rtrim(str_replace('\\', '/', $this->storagePath), '/')
            . '/planet_' . $planetSeed . '.json';
    }

    private function key(int $face, int $x, int $y): string
    {
        return $face . '|' . $x . '|' . $y;
    }
}
