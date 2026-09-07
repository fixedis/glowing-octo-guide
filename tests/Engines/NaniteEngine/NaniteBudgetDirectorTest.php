<?php

declare(strict_types=1);

// tests/Engines/NaniteEngine/NaniteBudgetDirectorTest.php

namespace Project\Tests\Engines\NaniteEngine;

use PHPUnit\Framework\TestCase;
use Project\Engines\NaniteEngine\Contracts\NaniteEntityInterface;
use Project\Engines\NaniteEngine\Core\NaniteBudgetDirector;
use Project\Engines\NaniteEngine\Core\Tiers\BillboardTierStrategy;
use Project\Engines\NaniteEngine\Core\Tiers\PointTierStrategy;
use Project\Engines\NaniteEngine\Core\Tiers\SurfaceTierStrategy;

final class NaniteBudgetDirectorTest extends TestCase
{
    private NaniteBudgetDirector $director;

    protected function setUp(): void
    {
        $this->director = new NaniteBudgetDirector([
            new SurfaceTierStrategy(),
            new BillboardTierStrategy(),
            new PointTierStrategy(),
        ]);
    }

    public function testSurfaceTierForLargeBody(): void
    {
        $star = $this->entity('star', 5000, 1000);
        $results = $this->director->evaluate([$star]);

        self::assertSame('surface', $results['star']->activeTier);
        self::assertSame(1000, $results['star']->surfaceWeight);
        self::assertTrue($results['star']->streamed);
        self::assertTrue($results['star']->simulated);
    }

    public function testPointTierForDistantBody(): void
    {
        $far = $this->entity('far', 1, 1000);
        $results = $this->director->evaluate([$far]);

        self::assertSame('point', $results['far']->activeTier);
        // Вес point в шкале 0..1000: при px=1 от верхней границы 24 -> ~958.
        self::assertGreaterThan(900, $results['far']->pointWeight);
        // Мелкое тело не симулируется (не фокус и меньше порога 120px).
        self::assertFalse($results['far']->simulated);
    }

    public function testFocusForcesSimulation(): void
    {
        $far = $this->entity('far', 1, 1000);
        $results = $this->director->evaluate([$far], 'far');

        self::assertTrue($results['far']->simulated);
    }

    public function testStreamingBudgetCap(): void
    {
        $entities = [];
        for ($i = 0; $i < 500; $i++) {
            $entities[] = $this->entity('e' . $i, 5000, 1000);
        }

        $results = $this->director->evaluate($entities);
        $streamed = 0;

        foreach ($results as $r) {
            if ($r->streamed) {
                $streamed++;
            }
        }

        self::assertSame(NaniteBudgetDirector::STREAMING_BUDGET, $streamed);
    }

    public function testDeterministicEvaluation(): void
    {
        $a = $this->director->evaluate([$this->entity('x', 300, 1000)]);
        $b = $this->director->evaluate([$this->entity('x', 300, 1000)]);

        self::assertSame($a['x']->toArray(), $b['x']->toArray());
    }

    /**
     * @param int $screenPx
     * @param int $baseRadius
     */
    private function entity(string $id, int $screenPx, int $baseRadius): NaniteEntityInterface
    {
        return new class($id, $screenPx, $baseRadius) implements NaniteEntityInterface {
            public function __construct(
                private readonly string $id,
                private readonly int $screenPx,
                private readonly int $baseRadius
            ) {
            }

            public function naniteEntityId(): string
            {
                return $this->id;
            }

            public function naniteScreenPx(): int
            {
                return $this->screenPx;
            }

            public function naniteBaseRadius(): int
            {
                return $this->baseRadius;
            }
        };
    }
}
