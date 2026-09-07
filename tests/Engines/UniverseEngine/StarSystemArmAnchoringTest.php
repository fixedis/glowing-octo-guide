<?php

declare(strict_types=1);

// tests/Engines/UniverseEngine/StarSystemArmAnchoringTest.php

namespace Project\Tests\Engines\UniverseEngine;

use PHPUnit\Framework\TestCase;
use Project\Engines\UniverseEngine\Core\GalaxyShape;
use Project\Engines\UniverseEngine\Core\SeedGraph;
use Project\Engines\UniverseEngine\Core\StarSystemGenerator;

/**
 * Ключевой инвариант интеграции MORTIS: звёздные системы обязаны лежать
 * ВНУТРИ спиральных рукавов (или близко к диску) — ни одной «оторванной»
 * системы вне видимой структуры галактики.
 */
final class StarSystemArmAnchoringTest extends TestCase
{
    private const ARM_TOLERANCE_FACTOR = 2.5;

    public function testMajorityOfSystemsLieOnArms(): void
    {
        $seedGraph = new SeedGraph();
        $generator = new StarSystemGenerator($seedGraph);
        $shape = GalaxyShape::create($seedGraph, 666013);

        $systems = $generator->generateForGalaxy(666013, 60, 200);
        self::assertNotEmpty($systems);

        // Ожидаемая доля «полевых» систем = 12%, значит на рукавах >= 80%.
        $onArms = 0;

        foreach ($systems as $system) {
            if ($this->distanceToNearestArm($shape, $system->x, $system->y) <= 1.0) {
                ++$onArms;
            }
        }

        $ratio = $onArms / count($systems);
        self::assertGreaterThan(
            0.8,
            $ratio,
            sprintf('На рукавах лишь %.1f%% систем — есть оторванные системы.', $ratio * 100)
        );
    }

    public function testNoSystemOutsideGalacticDisc(): void
    {
        $seedGraph = new SeedGraph();
        $generator = new StarSystemGenerator($seedGraph);
        $shape = GalaxyShape::create($seedGraph, 42);

        foreach ($generator->generateForGalaxy(42, 60, 200) as $system) {
            $r = sqrt($system->x ** 2 + $system->y ** 2);
            // Диск: от ядра до края + допуск округления.
            self::assertLessThanOrEqual(61.0, $r);
            self::assertSame(0, $system->z);
        }
    }

    /**
     * Нормированное расстояние точки до ближайшей осевой линии рукава:
     * 0 — точно на оси, 1.0 — на границе допуска ширины рукава.
     */
    private function distanceToNearestArm(GalaxyShape $shape, int $x, int $y): float
    {
        $r = sqrt($x ** 2 + $y ** 2);

        if ($r < 4.0) {
            return 0.0; // балдж
        }

        $theta = atan2((float) $y, (float) $x);
        $best = INF;

        for ($arm = 0; $arm < $shape->arms; ++$arm) {
            // Ищем lateral, при котором armAngle(r, arm, lateral) == theta.
            $base = ($arm / $shape->arms) * 2 * M_PI;
            $meander = $shape->armCenterOffset($r, $arm);

            for ($k = -3; $k <= 3; ++$k) {
                // Перебор витков спирали: theta + 2*pi*k.
                $target = $theta - $base - $r * $shape->twist + 2 * M_PI * $k;
                // armAngle = base + r*twist + lateral/r → lateral = r*(target)
                $lateral = $target * $r;
                $delta = abs($lateral - $meander);
                $width = max(0.001, $shape->armWidth($r, $arm));
                $normalized = $delta / ($width * self::ARM_TOLERANCE_FACTOR);
                $best = min($best, $normalized);
            }
        }

        return $best;
    }
}
