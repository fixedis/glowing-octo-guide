<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Core/PlanetGenerator.php

namespace Project\Engines\UniverseEngine\Core;

use Closure;
use Project\Engines\UniverseEngine\Entities\Planets\Planet;

final class PlanetGenerator
{
    private const MAX_ECCENTRICITY_FIXED = 300_000;
    private const MAX_INCLINATION_FIXED = 261_799;

    /**
     * Детерминированное сопоставление базового типа (для NaniteEngine-тиров)
     * на расширенный визуальный вариант (из client/src/core/planet-generator.ts).
     * Клиент НЕ считает variant — сервер отдаёт готовую строку, чтобы графика
     * совпадала у всех клиентов при одном seed.
     *
     * @var array<string, list<string>>
     */
    private const VARIANTS_BY_TYPE = [
        'terran' => [
            'earth_like', 'continental', 'tropical', 'ocean', 'swamp',
            'savanna', 'gaia_world', 'arid', 'desert',
        ],
        'ice' => [
            'arctic', 'tundra', 'snowball', 'frozen_wasteland', 'icy_moon',
        ],
        'lava' => [
            'lava_planet', 'fire_planet', 'volcanic', 'volcanic_moon',
        ],
        'gas' => [
            'gas_giant', 'hot_jupiter', 'cold_jupiter', 'ice_giant', 'saturn_like',
        ],
        'moon' => [
            'moon', 'barren_rock', 'mercury_like', 'titan_like',
        ],
    ];

    public function __construct(
        private readonly SeedGraph $seedGraph
    ) {
    }

    /**
     * @return list<Planet>
     */
    public function generateForSystem(int $systemSeed, int $planetCount): array
    {
        $planetCount = max(0, min(12, $planetCount));

        $rng = $this->seedGraph->rng('system/' . $systemSeed . '/planets');

        $planets = [];

        for ($i = 0; $i < $planetCount; $i++) {
            $planets[] = $this->buildPlanet($systemSeed, $i, $rng);
        }

        return $planets;
    }

    /**
     * @param Closure(): float $rng
     */
    private function buildPlanet(int $systemSeed, int $index, Closure $rng): Planet
    {
        $seed = $this->seedGraph->hashInts($systemSeed, $index);

        [$type, $radiusKm] = $this->pickTypeAndRadius($rng);

        // Расширенный визуальный вариант — детерминированно из того же RNG-потока.
        // Клиент получает готовую строку и НЕ пересчитывает её (совпадение по seed).
        $variants = self::VARIANTS_BY_TYPE[$type] ?? ['earth_like'];
        $variant = $variants[(int) floor($rng() * count($variants))];

        return new Planet(
            $seed,
            $index,
            $type,
            $radiusKm,
            500 + $index * 700 + (int) floor($rng() * 300),
            (int) floor($rng() * self::MAX_ECCENTRICITY_FIXED),
            (int) floor($rng() * self::MAX_INCLINATION_FIXED),
            $variant
        );
    }

    /**
     * @param Closure(): float $rng
     *
     * @return array{0: string, 1: int}
     */
    private function pickTypeAndRadius(Closure $rng): array
    {
        $roll = $rng();

        if ($roll < 0.30) {
            return [Planet::TYPE_TERRAN, 3000 + (int) floor($rng() * 5000)];
        }

        if ($roll < 0.50) {
            return [Planet::TYPE_ICE, 2500 + (int) floor($rng() * 3500)];
        }

        if ($roll < 0.65) {
            return [Planet::TYPE_LAVA, 2000 + (int) floor($rng() * 3000)];
        }

        if ($roll < 0.85) {
            return [Planet::TYPE_GAS, 20000 + (int) floor($rng() * 50000)];
        }

        return [Planet::TYPE_MOON, 800 + (int) floor($rng() * 1700)];
    }
}
