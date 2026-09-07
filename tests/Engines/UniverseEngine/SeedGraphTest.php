<?php

declare(strict_types=1);

// tests/Engines/UniverseEngine/SeedGraphTest.php

namespace Project\Tests\Engines\UniverseEngine;

use PHPUnit\Framework\TestCase;
use Project\Engines\UniverseEngine\Core\SeedGraph;

final class SeedGraphTest extends TestCase
{
    public function testHashEmptyStringReturnsOffsetBasis(): void
    {
        self::assertSame(2166136261, (new SeedGraph())->hash(''));
    }

    public function testHashKnownVector(): void
    {
        self::assertSame(0xE40C292C, (new SeedGraph())->hash('a'));
    }

    public function testHashDeterministicAndDistinct(): void
    {
        $graph = new SeedGraph();

        self::assertSame($graph->hash('1|0|0|0'), $graph->hash('1|0|0|0'));
        self::assertNotSame($graph->hash('1|0|0|0'), $graph->hash('1|0|0|1'));
    }

    public function testRngDeterministicAndInRange(): void
    {
        $graph = new SeedGraph();

        $first = $graph->rng('universe/chunk');
        $second = $graph->rng('universe/chunk');

        for ($i = 0; $i < 100; $i++) {
            $a = $first();
            $b = $second();

            self::assertSame($a, $b);
            self::assertGreaterThanOrEqual(0.0, $a);
            self::assertLessThan(1.0, $a);
        }
    }
}
