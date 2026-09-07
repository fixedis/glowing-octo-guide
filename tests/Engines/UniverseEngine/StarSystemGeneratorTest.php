<?php

declare(strict_types=1);

// tests/Engines/UniverseEngine/StarSystemGeneratorTest.php

namespace Project\Tests\Engines\UniverseEngine;

use PHPUnit\Framework\TestCase;
use Project\Engines\UniverseEngine\Core\StarSystemGenerator;
use Project\Engines\UniverseEngine\Core\SeedGraph;
use Project\Engines\UniverseEngine\Entities\Systems\StarSystem;

final class StarSystemGeneratorTest extends TestCase
{
    private function generator(): StarSystemGenerator
    {
        return new StarSystemGenerator(new SeedGraph());
    }

    public function testGenerationIsDeterministic(): void
    {
        $first = $this->generator()->generateForGalaxy(666013, 60);
        $second = $this->generator()->generateForGalaxy(666013, 60);

        self::assertEquals($first, $second);
    }

    public function testCountWithinBounds(): void
    {
        $systems = $this->generator()->generateForGalaxy(666013, 60, 40);

        self::assertGreaterThanOrEqual(10, count($systems));
        self::assertLessThanOrEqual(40, count($systems));
    }

    public function testSpectralTypeIsValid(): void
    {
        $valid = [
            StarSystem::SPECTRAL_O,
            StarSystem::SPECTRAL_B,
            StarSystem::SPECTRAL_A,
            StarSystem::SPECTRAL_F,
            StarSystem::SPECTRAL_G,
            StarSystem::SPECTRAL_K,
            StarSystem::SPECTRAL_M,
        ];

        foreach ($this->generator()->generateForGalaxy(42, 60) as $system) {
            self::assertContains($system->spectralType, $valid);
            self::assertGreaterThanOrEqual(0, $system->planetCount);
            self::assertLessThanOrEqual(12, $system->planetCount);
        }
    }

    public function testCoordsWithinGalaxyRadius(): void
    {
        $radius = 60;

        foreach ($this->generator()->generateForGalaxy(42, $radius) as $system) {
            $distanceXY = sqrt($system->x ** 2 + $system->y ** 2);

            self::assertLessThanOrEqual($radius + 1, $distanceXY);
            self::assertSame(0, $system->z);
        }
    }
}
