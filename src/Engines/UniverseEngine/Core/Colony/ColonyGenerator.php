<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Core/Colony/ColonyGenerator.php

namespace Project\Engines\UniverseEngine\Core\Colony;

use Closure;
use Project\Engines\UniverseEngine\Core\SeedGraph;
use Project\Engines\UniverseEngine\Entities\Buildings\Building;

final class ColonyGenerator
{
    public function __construct(
        private readonly SeedGraph $seedGraph
    ) {
    }

    public function planetHasColony(int $planetSeed): bool
    {
        $rng = $this->seedGraph->rng('planet/' . $planetSeed . '/colony');

        return $rng() < 0.6;
    }

    public function proceduralCell(
        int $planetSeed,
        int $face,
        int $x,
        int $y,
        int $depth
    ): ?string {
        if (!$this->planetHasColony($planetSeed)) {
            return null;
        }

        $density = $this->density($planetSeed);

        $rng = $this->seedGraph->rng(
            'planet/' . $planetSeed . '/cell/' . $face . '/' . $x . '/' . $y . '/' . $depth
        );

        if ($rng() >= $density) {
            return null;
        }

        return $this->pickType($rng);
    }

    private function density(int $planetSeed): float
    {
        $rng = $this->seedGraph->rng('planet/' . $planetSeed . '/density');

        return 0.05 + $rng() * 0.20;
    }

    /**
     * @param Closure(): float $rng
     */
    private function pickType(Closure $rng): string
    {
        $roll = $rng();

        if ($roll < 0.35) {
            return Building::TYPE_DOME;
        }

        if ($roll < 0.55) {
            return Building::TYPE_EXTRACTOR;
        }

        if ($roll < 0.70) {
            return Building::TYPE_POWER;
        }

        if ($roll < 0.82) {
            return Building::TYPE_TURRET;
        }

        if ($roll < 0.92) {
            return Building::TYPE_TOWER;
        }

        return Building::TYPE_LANDING_PAD;
    }
}
