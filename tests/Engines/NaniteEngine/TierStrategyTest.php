<?php

declare(strict_types=1);

// tests/Engines/NaniteEngine/TierStrategyTest.php

namespace Project\Tests\Engines\NaniteEngine;

use PHPUnit\Framework\TestCase;
use Project\Engines\NaniteEngine\Core\Tiers\BillboardTierStrategy;
use Project\Engines\NaniteEngine\Core\Tiers\PointTierStrategy;
use Project\Engines\NaniteEngine\Core\Tiers\SurfaceTierStrategy;

final class TierStrategyTest extends TestCase
{
    public function testSurfaceActiveAboveThreshold(): void
    {
        $tier = new SurfaceTierStrategy();
        // Шкала весов 0..1000. При px=1000 (>> верхней границы) вес максимален.
        self::assertSame(1000, $tier->weight(1000, 1000));
        self::assertSame(0, $tier->weight(10, 1000));
    }

    public function testPointComplementarity(): void
    {
        $tier = new PointTierStrategy();
        // Шкала весов 0..1000: при px=0 point максимален, при px>=24 -> 0.
        self::assertSame(1000, $tier->weight(0, 1000));
        self::assertSame(0, $tier->weight(100, 1000));
    }

    public function testThresholdScalesWithRadius(): void
    {
        $tier = new SurfaceTierStrategy();
        // Радиус в 10x меньше -> порог в 10x выше (тело детально позже).
        $big = $tier->thresholdPx(1000);
        $small = $tier->thresholdPx(100);
        self::assertGreaterThan($big, $small);
        self::assertSame($big * 10, $small);
    }

    public function testBillboardFallsOffForLargeBody(): void
    {
        $billboard = new BillboardTierStrategy();
        // Крупное тело (px=5000 >> 2*upper) уходит в surface: billboard ~ 0.
        self::assertSame(0, $billboard->weight(5000, 1000));
    }

    public function testBillboardDominatesMidRange(): void
    {
        $surface = new SurfaceTierStrategy();
        $billboard = new BillboardTierStrategy();
        $point = new PointTierStrategy();
        $r = 1000;

        // В середине диапазона (px=50) surface ещё мал, point уже упал,
        // billboard доминирует (наибольший вес).
        $s = $surface->weight(50, $r);   // 0 (ниже порога 120)
        $b = $billboard->weight(50, $r); // (50-24)*1000/40 = 650
        $p = $point->weight(50, $r);     // 0 (выше верхней 24)

        self::assertSame(0, $s);
        self::assertSame(650, $b);
        self::assertSame(0, $p);
        self::assertGreaterThan($s, $b);
        self::assertGreaterThan($p, $b);
    }
}
