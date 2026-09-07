<?php

declare(strict_types=1);

// tests/Engines/UniverseEngine/ColonyGeneratorTest.php

namespace Project\Tests\Engines\UniverseEngine;

use PHPUnit\Framework\TestCase;
use Project\Engines\UniverseEngine\Core\Colony\ColonyGenerator;
use Project\Engines\UniverseEngine\Core\SeedGraph;
use Project\Engines\UniverseEngine\Entities\Buildings\Building;

final class ColonyGeneratorTest extends TestCase
{
    private function generator(): ColonyGenerator
    {
        return new ColonyGenerator(new SeedGraph());
    }

    public function testProceduralCellIsDeterministic(): void
    {
        $first = $this->generator();
        $second = $this->generator();

        for ($x = 0; $x < 4; $x++) {
            for ($y = 0; $y < 4; $y++) {
                self::assertSame(
                    $first->proceduralCell(1337, 0, $x, $y, 2),
                    $second->proceduralCell(1337, 0, $x, $y, 2)
                );
            }
        }
    }

    public function testProceduralTypeIsValid(): void
    {
        $generator = $this->generator();

        for ($seed = 1; $seed <= 20; $seed++) {
            for ($x = 0; $x < 4; $x++) {
                for ($y = 0; $y < 4; $y++) {
                    $type = $generator->proceduralCell($seed, 0, $x, $y, 2);

                    if ($type !== null) {
                        self::assertContains($type, Building::TYPES);
                    }
                }
            }
        }
    }

    public function testPlanetWithoutColonyHasNoBuildings(): void
    {
        $generator = $this->generator();

        $seed = 1;

        while ($seed < 100 && $generator->planetHasColony($seed)) {
            $seed++;
        }

        self::assertFalse($generator->planetHasColony($seed));

        for ($face = 0; $face < 6; $face++) {
            for ($x = 0; $x < 4; $x++) {
                for ($y = 0; $y < 4; $y++) {
                    self::assertNull($generator->proceduralCell($seed, $face, $x, $y, 2));
                }
            }
        }
    }

    public function testPlanetHasColonyIsDeterministic(): void
    {
        $first = $this->generator();
        $second = $this->generator();

        for ($seed = 1; $seed <= 50; $seed++) {
            self::assertSame(
                $first->planetHasColony($seed),
                $second->planetHasColony($seed)
            );
        }
    }
}
