<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Core/StarSystemGenerator.php

namespace Project\Engines\UniverseEngine\Core;

use Closure;
use InvalidArgumentException;
use Project\Engines\UniverseEngine\Entities\Systems\StarSystem;

final class StarSystemGenerator
{
    public function __construct(
        private readonly SeedGraph $seedGraph
    ) {
    }

    /**
     * Системы раскладываются ВДОЛЬ спиральных рукавов галактики.
     * Форма рукавов выводится через GalaxyShape из того же seed, что и
     * визуал частиц на клиенте — системы всегда лежат внутри рукавов,
     * ни одна не «оторвана» от диска.
     *
     * @return list<StarSystem>
     */
    public function generateForGalaxy(
        int $galaxySeed,
        int $galaxyRadius,
        int $maxSystems = 40
    ): array {
        if ($galaxyRadius <= 0) {
            throw new InvalidArgumentException(sprintf(
                'Galaxy radius must be greater than zero. Got: %d',
                $galaxyRadius
            ));
        }

        $maxSystems = max(10, min(200, $maxSystems));

        $rng = $this->seedGraph->rng('galaxy/' . $galaxySeed . '/systems');

        $count = 10 + (int) floor($rng() * ($maxSystems - 9));

        // Форма спирали детерминирована seed-ом и идентична клиентской GalaxyShape.
        $shape = GalaxyShape::create($this->seedGraph, $galaxySeed);

        $systems = [];

        for ($i = 0; $i < $count; $i++) {
            // Минимальная дистанция: 8% радиуса галактики (но не меньше 4
            // юнитов) — системы не слипаются в кучки, карта читается.
            $minDist = max(4.0, 0.08 * $galaxyRadius);
            $system = $this->buildSystem($shape, $galaxySeed, $galaxyRadius, $i, $rng);
            $attempts = 0;
            while (!$this->farEnough($systems, $system, $minDist) && $attempts < 12) {
                $system = $this->buildSystem($shape, $galaxySeed, $galaxyRadius, $i, $rng);
                ++$attempts;
            }
            $systems[] = $system;
        }

        return $systems;
    }

    /**
     * Проверяет, что новая система не ближе minDist ни к одной из принятых.
     *
     * @param list<StarSystem> $systems
     */
    private function farEnough(array $systems, StarSystem $candidate, float $minDist): bool
    {
        foreach ($systems as $s) {
            $dx = $s->x - $candidate->x;
            $dy = $s->y - $candidate->y;
            if ($dx * $dx + $dy * $dy < $minDist * $minDist) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param Closure(): float $rng
     */
    private function buildSystem(
        GalaxyShape $shape,
        int $galaxySeed,
        int $galaxyRadius,
        int $index,
        Closure $rng
    ): StarSystem {
        $seed = $this->seedGraph->hashInts($galaxySeed, $index);

        $R = (float) $galaxyRadius;

        // ~12% систем — «полевые», в межрукавном пространстве (диск живой,
        // но основная масса строго по рукавам).
        if ($rng() < 0.12) {
            return $this->makeSystem(
                $seed,
                $galaxySeed,
                $index,
                $rng,
                (int) round(cos($rng() * 2 * M_PI) * pow($rng(), 1.3) * $R),
                (int) round(sin($rng() * 2 * M_PI) * pow($rng(), 1.3) * $R)
            );
        }

        // Позиция НА рукаве: радиус + поперечный сдвиг в границах ширины рукава.
        // Распределение r^0.85 даёт плотнее к центру, как у звёзд визуала (r^1.15
        // у молодых звёзд + сгущение к узлам звездообразования).
        $arm = $index % $shape->arms;
        $r = 6.0 + pow($rng(), 0.85) * max(1.0, $R - 8);
        $width = $shape->armWidth($r, $arm);
        $meander = $shape->armCenterOffset($r, $arm);
        // Поперечный сдвиг ~гауссовский: сумма двух равномерных.
        $lateral = $meander + (($rng() + $rng() - 1.0)) * $width;

        $angle = $shape->armAngle((float) $r, $arm, $lateral);

        return $this->makeSystem(
            $seed,
            $galaxySeed,
            $index,
            $rng,
            (int) round(cos($angle) * $r),
            (int) round(sin($angle) * $r)
        );
    }

    /**
     * @param Closure(): float $rng
     */
    private function makeSystem(
        int $seed,
        int $galaxySeed,
        int $index,
        Closure $rng,
        int $x,
        int $y
    ): StarSystem {
        return new StarSystem(
            $seed,
            'SYS-' . (1 + (int) floor($rng() * 9999)),
            $this->pickSpectralType($rng),
            $x,
            $y,
            0, // полностью плоская карта,
            $this->rollPlanetCount($rng)
        );
    }

    /**
     * Количество планет: диапазон 1..8, НО смещено к 3..5 (встречаются чаще),
     * а 8 — очень редко. Взвешенная рулетка по сидам системы.
     */
    private function rollPlanetCount(Closure $rng): int
    {
        // Веса по количеству планет: пик в 3..5, хвосты (1,2 и 6,7) реже,
        // 8 — экстремально редко.
        static $weights = [1 => 1.0, 2 => 1.6, 3 => 3.0, 4 => 3.5, 5 => 3.0, 6 => 2.0, 7 => 1.2, 8 => 0.3];
        $total = 0.0;
        foreach ($weights as $w) {
            $total += $w;
        }
        $roll = $rng() * $total;
        $acc = 0.0;
        foreach ($weights as $count => $w) {
            $acc += $w;
            if ($roll <= $acc) {
                return $count;
            }
        }
        return 5; // fallback — в центр распределения
    }

    /**
     * @param Closure(): float $rng
     */
    private function pickSpectralType(Closure $rng): string
    {
        $roll = $rng();

        if ($roll < 0.03) {
            return StarSystem::SPECTRAL_O;
        }

        if ($roll < 0.08) {
            return StarSystem::SPECTRAL_B;
        }

        if ($roll < 0.15) {
            return StarSystem::SPECTRAL_A;
        }

        if ($roll < 0.25) {
            return StarSystem::SPECTRAL_F;
        }

        if ($roll < 0.40) {
            return StarSystem::SPECTRAL_G;
        }

        if ($roll < 0.65) {
            return StarSystem::SPECTRAL_K;
        }

        return StarSystem::SPECTRAL_M;
    }
}
