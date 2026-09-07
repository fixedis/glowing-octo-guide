<?php

declare(strict_types=1);

// tests/Engines/UniverseEngine/GalaxyShapeTest.php

namespace Project\Tests\Engines\UniverseEngine;

use PHPUnit\Framework\TestCase;
use Project\Engines\UniverseEngine\Core\GalaxyShape;
use Project\Engines\UniverseEngine\Core\SeedGraph;

final class GalaxyShapeTest extends TestCase
{
    public function testGenerationIsDeterministic(): void
    {
        $first = GalaxyShape::create(new SeedGraph(), 666013);
        $second = GalaxyShape::create(new SeedGraph(), 666013);

        self::assertEquals($first->arms, $second->arms);
        self::assertSame($first->twist, $second->twist);
        self::assertSame($first->spinSpeed, $second->spinSpeed);
    }

    public function testArmsWithinRange(): void
    {
        foreach ([1, 42, 666013, 987654321] as $seed) {
            $shape = GalaxyShape::create(new SeedGraph(), $seed);
            self::assertGreaterThanOrEqual(1, $shape->arms);
            self::assertLessThanOrEqual(5, $shape->arms);
        }
    }

    public function testVortexSpinIsDeterministicAndBounded(): void
    {
        // Дизайн 2026-08: знак воронки САМОСТОЯТЕЛЬНЫЙ (не наследует диск),
        // а визуально воронка вообще не вращается отдельно от слоя систем.
        foreach (range(1, 20) as $seed) {
            $first = GalaxyShape::create(new SeedGraph(), $seed);
            $second = GalaxyShape::create(new SeedGraph(), $seed);
            self::assertSame($first->vortexSpin, $second->vortexSpin);
            self::assertGreaterThanOrEqual(-0.08, $first->vortexSpin);
            self::assertLessThanOrEqual(0.08, $first->vortexSpin);
        }
    }

    public function testArmCurveIsContinuous(): void
    {
        $shape = GalaxyShape::create(new SeedGraph(), 666013);

        $previous = $shape->armAngle(4.0, 0, $shape->armCenterOffset(4.0, 0));

        for ($r = 5.0; $r < 60.0; $r += 0.5) {
            $angle = $shape->armAngle($r, 0, $shape->armCenterOffset($r, 0));
            self::assertLessThan(0.5, abs($angle - $previous), 'Осевая линия рукава не должна прыгать.');
            $previous = $angle;
        }
    }
}
