<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Core/GalaxyGenerator.php

namespace Project\Engines\UniverseEngine\Core;

use Closure;
use Project\Engines\UniverseEngine\Entities\Galaxies\Galaxy;

final class GalaxyGenerator
{
    private const CATALOG_PREFIXES = ['NGC', 'UGC', 'PGC', 'IC', 'MCG', 'ESO'];

    // Небольшая разница высот для карты вселенной ("тарелка", а не куб).
    private const HEIGHT_SPREAD = 150;

    public function __construct(
        private readonly SeedGraph $seedGraph
    ) {
    }

    /**
     * @return list<Galaxy>
     */
    public function generateChunk(
        int $universeSeed,
        int $chunkX,
        int $chunkY,
        int $chunkZ,
        int $chunkSize = 1000,
        int $maxGalaxies = 12
    ): array {
        if ($chunkSize <= 0) {
            throw new \InvalidArgumentException(sprintf(
                'Chunk size must be greater than zero. Got: %d',
                $chunkSize
            ));
        }

        // "Пол" карты XZ: клиент шлёт (cx=X, cy=Z). Галактики распределены
        // по всей плоскости — пустых чанков нет, слой высоты тонкий (y≈0).

        $maxGalaxies = max(0, min(50, $maxGalaxies));

        $rng = $this->seedGraph->rng(
            (string) $this->seedGraph->hashInts($universeSeed, $chunkX, $chunkY, $chunkZ)
        );

        $count = 3 + (int) floor($rng() * ($maxGalaxies - 2));

        $galaxies = [];

        for ($i = 0; $i < $count; $i++) {
            $galaxies[] = $this->buildGalaxy($universeSeed, $chunkX, $chunkY, $chunkSize, $i, $rng);
        }

        return $galaxies;
    }

    /**
     * @param Closure(): float $rng
     */
    private function buildGalaxy(
        int $universeSeed,
        int $chunkX,
        int $chunkY,
        int $chunkSize,
        int $index,
        Closure $rng
    ): Galaxy {
        $seed = $this->seedGraph->hashInts($universeSeed, $chunkX, $chunkY, $index);

        $prefix = self::CATALOG_PREFIXES[
            (int) floor($rng() * count(self::CATALOG_PREFIXES))
        ];

        $number = 1 + (int) floor($rng() * 9999);

        $typeRoll = $rng();

        if ($typeRoll < 0.6) {
            $type = Galaxy::TYPE_SPIRAL;
        } elseif ($typeRoll < 0.8) {
            $type = Galaxy::TYPE_ELLIPTICAL;
        } else {
            $type = Galaxy::TYPE_IRREGULAR;
        }

        return new Galaxy(
            $seed,
            $prefix . '-' . $number,
            $type,
            // "Пол" карты: разброс по X и Z, высота Y — тонкий слой.
            // Клиентская карта XZ шлёт чанк как (cx=X, cy=Z), поэтому
            // Z-компонента строится из $chunkY (второй индекс).
            $chunkX * $chunkSize + (int) floor($rng() * $chunkSize),
            (int) round(($rng() * 2 - 1) * self::HEIGHT_SPREAD),
            $chunkY * $chunkSize + (int) floor($rng() * $chunkSize),
            25 + (int) floor($rng() * 96)
        );
    }
}
