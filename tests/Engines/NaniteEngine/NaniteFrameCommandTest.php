<?php

declare(strict_types=1);

// tests/Engines/NaniteEngine/NaniteFrameCommandTest.php

namespace Project\Tests\Engines\NaniteEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Logging\NullLogger;
use Project\CoreEngine\Core\State;
use Project\Engines\NaniteEngine\Core\Commands\EvaluateNaniteFrameHandler;
use Project\Engines\NaniteEngine\Core\NaniteBudgetDirector;
use Project\Engines\NaniteEngine\Core\Tiers\BillboardTierStrategy;
use Project\Engines\NaniteEngine\Core\Tiers\PointTierStrategy;
use Project\Engines\NaniteEngine\Core\Tiers\SurfaceTierStrategy;

final class NaniteFrameCommandTest extends TestCase
{
    private EvaluateNaniteFrameHandler $handler;
    private State $state;

    protected function setUp(): void
    {
        $director = new NaniteBudgetDirector([
            new SurfaceTierStrategy(),
            new BillboardTierStrategy(),
            new PointTierStrategy(),
        ]);
        $this->handler = new EvaluateNaniteFrameHandler($director);
        $this->state = new State();
    }

    public function testEvaluatesFrameAndStoresSnapshot(): void
    {
        $command = new Command(
            'cmd-1',
            'EvaluateNaniteFrame',
            [
                'entities' => [
                    ['id' => 'star', 'screenPx' => 5000, 'baseRadius' => 1000],
                    ['id' => 'far', 'screenPx' => 2, 'baseRadius' => 1000],
                ],
            ]
        );

        $result = $this->handler->handle($command, $this->state);

        self::assertTrue($result->success);
        self::assertNotNull($this->state->get('nanite.snapshot'));
        self::assertSame('surface', $this->state->get('nanite.tiers')['star']);
        self::assertSame('point', $this->state->get('nanite.tiers')['far']);
    }

    public function testEmitsTierChangedOnTransition(): void
    {
        $this->runFrame([['id' => 'body', 'screenPx' => 2, 'baseRadius' => 1000]]);
        $result = $this->runFrame([['id' => 'body', 'screenPx' => 5000, 'baseRadius' => 1000]]);

        $types = array_map(static fn ($e) => $e->type, $result->events);
        self::assertContains('NaniteTierChanged', $types);
    }

    public function testFailsOnMissingEntities(): void
    {
        $command = new Command('cmd-x', 'EvaluateNaniteFrame', []);
        $result = $this->handler->handle($command, $this->state);

        self::assertFalse($result->success);
    }

    public function testStableFrameDoesNotChangeSignature(): void
    {
        $this->runFrame([['id' => 'body', 'screenPx' => 5000, 'baseRadius' => 1000]]);
        $firstSig = $this->state->get('nanite.signature');

        $this->runFrame([['id' => 'body', 'screenPx' => 5000, 'baseRadius' => 1000]]);
        $secondSig = $this->state->get('nanite.signature');

        self::assertSame($firstSig, $secondSig);
        self::assertSame(1, $this->state->get('nanite.stableFrames'));
    }

    /**
     * @param list<array{id: string, screenPx: int, baseRadius: int}> $entities
     */
    private function runFrame(array $entities): CommandResult
    {
        $command = new Command('c-' . uniqid(), 'EvaluateNaniteFrame', ['entities' => $entities]);

        return $this->handler->handle($command, $this->state);
    }
}
