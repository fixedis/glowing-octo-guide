<?php

declare(strict_types=1);

// tests/Engines/UniverseEngine/ColonyResolverTest.php

namespace Project\Tests\Engines\UniverseEngine;

use PHPUnit\Framework\TestCase;
use Project\Engines\UniverseEngine\Contracts\BuildingDeltaStoreInterface;
use Project\Engines\UniverseEngine\Core\Colony\ColonyGenerator;
use Project\Engines\UniverseEngine\Core\Colony\ColonyResolver;
use Project\Engines\UniverseEngine\Core\Colony\InMemoryBuildingDeltaStore;
use Project\Engines\UniverseEngine\Core\SeedGraph;

final class ColonyResolverTest extends TestCase
{
    private SeedGraph $seedGraph;
    private ColonyGenerator $generator;
    private BuildingDeltaStoreInterface $store;
    private ColonyResolver $resolver;

    protected function setUp(): void
    {
        $this->seedGraph = new SeedGraph();
        $this->generator = new ColonyGenerator($this->seedGraph);
        $this->store = new InMemoryBuildingDeltaStore();
        $this->resolver = new ColonyResolver($this->generator, $this->store, $this->seedGraph);
    }

    public function testNoDeltaEqualsProcedural(): void
    {
        for ($x = 0; $x < 4; $x++) {
            for ($y = 0; $y < 4; $y++) {
                self::assertSame(
                    $this->generator->proceduralCell(1337, 0, $x, $y, 2),
                    $this->resolver->resolveCell(1337, 0, $x, $y, 2)
                );
            }
        }
    }

    public function testPlaceOverridesEmptyCell(): void
    {
        $seed = 1337;
        $cell = null;

        for ($x = 0; $x < 8 && $cell === null; $x++) {
            for ($y = 0; $y < 8 && $cell === null; $y++) {
                if ($this->resolver->resolveCell($seed, 0, $x, $y, 3) === null) {
                    $cell = [$x, $y];
                }
            }
        }

        self::assertNotNull($cell);

        $this->store->place($seed, 0, $cell[0], $cell[1], 'dome');

        self::assertSame('dome', $this->resolver->resolveCell($seed, 0, $cell[0], $cell[1], 3));
    }

    public function testDemolishRemovesProceduralBuilding(): void
    {
        $seed = 1337;
        $cell = null;

        for ($s = $seed; $s < $seed + 100 && $cell === null; $s++) {
            if (!$this->generator->planetHasColony($s)) {
                continue;
            }

            for ($x = 0; $x < 8 && $cell === null; $x++) {
                for ($y = 0; $y < 8 && $cell === null; $y++) {
                    if ($this->generator->proceduralCell($s, 0, $x, $y, 3) !== null) {
                        $cell = [$s, $x, $y];
                    }
                }
            }
        }

        self::assertNotNull($cell);

        $this->store->demolish($cell[0], 0, $cell[1], $cell[2]);

        self::assertNull($this->resolver->resolveCell($cell[0], 0, $cell[1], $cell[2], 3));
    }
}
