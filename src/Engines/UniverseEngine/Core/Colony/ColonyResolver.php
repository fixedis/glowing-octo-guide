<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Core/Colony/ColonyResolver.php

namespace Project\Engines\UniverseEngine\Core\Colony;

use Project\Engines\UniverseEngine\Contracts\BuildingDeltaStoreInterface;
use Project\Engines\UniverseEngine\Core\SeedGraph;
use Project\Engines\UniverseEngine\Entities\Buildings\Building;

/**
 * Итоговое состояние клетки: дельта игрока ?? процедурная генерация.
 */
final class ColonyResolver
{
    public function __construct(
        private readonly ColonyGenerator $generator,
        private readonly BuildingDeltaStoreInterface $store,
        private readonly SeedGraph $seedGraph
    ) {
    }

    public function resolveCell(
        int $planetSeed,
        int $face,
        int $x,
        int $y,
        int $depth
    ): ?string {
        $delta = $this->store->getDelta($planetSeed, $face, $x, $y);

        if ($delta !== null) {
            return $delta === BuildingDeltaStoreInterface::REMOVED ? null : $delta;
        }

        return $this->generator->proceduralCell($planetSeed, $face, $x, $y, $depth);
    }

    public function buildingFor(
        int $planetSeed,
        int $face,
        int $x,
        int $y,
        int $depth
    ): ?Building {
        $type = $this->resolveCell($planetSeed, $face, $x, $y, $depth);

        if ($type === null) {
            return null;
        }

        return new Building(
            $this->seedGraph->hashInts($planetSeed, $face, $x, $y, $depth),
            $planetSeed,
            $face,
            $x,
            $y,
            $depth,
            $type
        );
    }
}
