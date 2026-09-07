<?php

declare(strict_types=1);

// tests/Engines/UniverseEngine/PlanetGeneratorTest.php

namespace Project\Tests\Engines\UniverseEngine;

use PHPUnit\Framework\TestCase;
use Project\Engines\UniverseEngine\Core\PlanetGenerator;
use Project\Engines\UniverseEngine\Core\SeedGraph;
use Project\Engines\UniverseEngine\Entities\Planets\Planet;

final class PlanetGeneratorTest extends TestCase
{
    private function generator(): PlanetGenerator
    {
        return new PlanetGenerator(new SeedGraph());
    }

    public function testGenerationIsDeterministic(): void
    {
        $first = $this->generator()->generateForSystem(1234, 6);
        $second = $this->generator()->generateForSystem(1234, 6);

        self::assertEquals($first, $second);
    }

    public function testCountIsClamped(): void
    {
        self::assertCount(0, $this->generator()->generateForSystem(1, -5));
        self::assertCount(12, $this->generator()->generateForSystem(1, 99));
    }

    public function testTypeIsValidAndEccentricityBounded(): void
    {
        $valid = [
            Planet::TYPE_TERRAN,
            Planet::TYPE_ICE,
            Planet::TYPE_LAVA,
            Planet::TYPE_GAS,
            Planet::TYPE_MOON,
        ];

        foreach ($this->generator()->generateForSystem(42, 10) as $planet) {
            self::assertContains($planet->type, $valid);
            self::assertLessThanOrEqual(300_000, $planet->eccentricityFixed);
            self::assertLessThanOrEqual(261_799, $planet->inclinationFixed);
        }
    }

    public function testSemiMajorAxisStrictlyIncreases(): void
    {
        $planets = $this->generator()->generateForSystem(42, 8);

        for ($i = 1; $i < count($planets); $i++) {
            self::assertGreaterThan(
                $planets[$i - 1]->semiMajorAxisAuMilli,
                $planets[$i]->semiMajorAxisAuMilli
            );
        }
    }
}
