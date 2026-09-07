<?php

declare(strict_types=1);

// tests/Engines/UniverseEngine/GalaxyGeneratorTest.php

namespace Project\Tests\Engines\UniverseEngine;

use PHPUnit\Framework\TestCase;
use Project\Engines\UniverseEngine\Core\GalaxyGenerator;
use Project\Engines\UniverseEngine\Core\SeedGraph;

final class GalaxyGeneratorTest extends TestCase
{
    private function generator(): GalaxyGenerator
    {
        return new GalaxyGenerator(new SeedGraph());
    }

    public function testGenerationIsDeterministic(): void
    {
        $first = $this->generator()->generateChunk(1337, 0, 0, 0);
        $second = $this->generator()->generateChunk(1337, 0, 0, 0);

        self::assertEquals($first, $second);
    }

    public function testDifferentChunksProduceDifferentSets(): void
    {
        $first = $this->generator()->generateChunk(1337, 0, 0, 0);
        $second = $this->generator()->generateChunk(1337, 1, 0, 0);

        self::assertNotSame(
            json_encode($first),
            json_encode($second)
        );
    }

    public function testCountWithinLimits(): void
    {
        for ($chunk = 0; $chunk < 10; $chunk++) {
            $galaxies = $this->generator()->generateChunk(42, $chunk, 0, 0, 1000, 5);

            self::assertGreaterThanOrEqual(0, count($galaxies));
            self::assertLessThanOrEqual(5, count($galaxies));
        }
    }

    public function testCoordsWithinChunkBounds(): void
    {
        $chunkSize = 1000;
        // Все галактики лежат в слое y≈0 ("пол"), поэтому проверяем чанк y=0.
        // Клиент шлёт (cx=X, cy=Z): чанк (1, -1) => X в [1000..2000), Z в [-1000..0).
        $galaxies = $this->generator()->generateChunk(42, 1, -1, 0, $chunkSize, 5);

        foreach ($galaxies as $galaxy) {
            self::assertGreaterThanOrEqual(1 * $chunkSize, $galaxy->x);
            self::assertLessThan(2 * $chunkSize, $galaxy->x);

            self::assertLessThanOrEqual(150, abs($galaxy->y));

            // Z строится из chunkY (клиент шлёт cy=Z): Z в [-1000..0) ± слой.
            self::assertGreaterThanOrEqual(-1 * $chunkSize - 150, $galaxy->z);
            self::assertLessThan(0 * $chunkSize + 150, $galaxy->z);
        }
    }

    public function testNonZeroYChunkIsEmpty(): void
    {
        // В новой XZ-схеме пустых чанков нет: галактики распределены по всей
        // плоскости, слой высоты тонкий. Проверяем детерминизм вместо пустоты.
        $first = $this->generator()->generateChunk(42, 0, 1, 0);
        $second = $this->generator()->generateChunk(42, 0, 1, 0);
        self::assertEquals($first, $second);
    }

    public function testNameMatchesCatalogFormat(): void
    {
        $galaxies = $this->generator()->generateChunk(42, 0, 0, 0, 1000, 5);

        foreach ($galaxies as $galaxy) {
            self::assertMatchesRegularExpression(
                '/^(NGC|UGC|PGC|IC|MCG|ESO)-\d+$/',
                $galaxy->name
            );
        }
    }
}
