<?php

declare(strict_types=1);

// tests/CoreEngine/DeterministicRandomTest.php

namespace Project\Tests\CoreEngine;

use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Contracts\MathKernelInterface;
use Project\CoreEngine\Core\DeterministicRandom;
use Project\CoreEngine\Core\Logging\NullLogger;

final class DeterministicRandomTest extends TestCase
{
    private function createRandom(string $seed = 'test-seed', int $tick = 1): DeterministicRandom
    {
        return new DeterministicRandom(new NullLogger(), $seed, $tick);
    }

    public function testProducesDeterministicSequence(): void
    {
        $first = $this->createRandom();
        $second = $this->createRandom();

        $firstValueA = $first->nextInt(0, 100, 'test-scope');
        $firstValueB = $first->nextInt(0, 100, 'test-scope');

        $secondValueA = $second->nextInt(0, 100, 'test-scope');
        $secondValueB = $second->nextInt(0, 100, 'test-scope');

        self::assertSame($firstValueA, $secondValueA);
        self::assertSame($firstValueB, $secondValueB);
    }

    public function testNextIntReturnsValueWithinRange(): void
    {
        $random = $this->createRandom();

        for ($i = 0; $i < 100; $i++) {
            $value = $random->nextInt(10, 20, 'range-test');

            self::assertGreaterThanOrEqual(10, $value);
            self::assertLessThanOrEqual(20, $value);
        }
    }

    public function testNextFixedReturnsValueWithinScale(): void
    {
        $random = $this->createRandom();
        $scale = 1000;

        for ($i = 0; $i < 100; $i++) {
            $value = $random->nextFixed('fixed-test', $scale);

            self::assertGreaterThanOrEqual(0, $value);
            self::assertLessThanOrEqual($scale, $value);
        }
    }

    public function testChanceBoundaries(): void
    {
        $random = $this->createRandom();

        self::assertFalse($random->chance(0, 'chance-test'));
        self::assertTrue($random->chance(MathKernelInterface::DEFAULT_SCALE, 'chance-test'));
    }

    public function testThrowsExceptionWhenMinGreaterThanMax(): void
    {
        $random = $this->createRandom();

        $this->expectException(InvalidArgumentException::class);

        $random->nextInt(20, 10, 'invalid-range');
    }

    public function testThrowsExceptionWhenProbabilityIsOutOfRange(): void
    {
        $random = $this->createRandom();

        $this->expectException(InvalidArgumentException::class);

        $random->chance(-1, 'invalid-probability');
    }

    public function testThrowsExceptionWhenScopeIsEmpty(): void
    {
        $random = $this->createRandom();

        $this->expectException(InvalidArgumentException::class);

        $random->nextInt(0, 10, '   ');
    }
}
