<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Core/Colony/InMemoryBuildingDeltaStore.php

namespace Project\Engines\UniverseEngine\Core\Colony;

use Project\Engines\UniverseEngine\Contracts\BuildingDeltaStoreInterface;

final class InMemoryBuildingDeltaStore implements BuildingDeltaStoreInterface
{
    /**
     * @var array<string, string>
     */
    private array $deltas = [];

    public function getDelta(int $planetSeed, int $face, int $x, int $y): ?string
    {
        return $this->deltas[$this->key($planetSeed, $face, $x, $y)] ?? null;
    }

    public function place(int $planetSeed, int $face, int $x, int $y, string $buildingType): void
    {
        $this->deltas[$this->key($planetSeed, $face, $x, $y)] = $buildingType;
    }

    public function demolish(int $planetSeed, int $face, int $x, int $y): void
    {
        $this->deltas[$this->key($planetSeed, $face, $x, $y)] = self::REMOVED;
    }

    private function key(int $planetSeed, int $face, int $x, int $y): string
    {
        return $planetSeed . '|' . $face . '|' . $x . '|' . $y;
    }
}
