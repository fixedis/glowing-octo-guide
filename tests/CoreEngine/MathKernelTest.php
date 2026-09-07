<?php

declare(strict_types=1);

// tests/CoreEngine/MathKernelTest.php

namespace Project\Tests\CoreEngine;

use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Contracts\MathKernelInterface;
use Project\CoreEngine\Core\Logging\NullLogger;
use Project\CoreEngine\Core\MathKernel;
use Project\CoreEngine\Core\RoundingMode;
use RuntimeException;

final class MathKernelTest extends TestCase
{
    private function math(): MathKernel
    {
        return new MathKernel(new NullLogger());
    }

    public function testAddsIntegers(): void
    {
        $math = $this->math();

        self::assertSame(5, $math->add(2, 3));
        self::assertSame(-1, $math->add(2, -3));
    }

    public function testSubtractsIntegers(): void
    {
        $math = $this->math();

        self::assertSame(4, $math->subtract(7, 3));
        self::assertSame(-2, $math->subtract(5, 7));
    }

    public function testMultipliesIntegers(): void
    {
        $math = $this->math();

        self::assertSame(42, $math->multiply(6, 7));
        self::assertSame(-42, $math->multiply(6, -7));
    }

    public function testClampsValues(): void
    {
        $math = $this->math();

        self::assertSame(10, $math->clamp(5, 10, 20));
        self::assertSame(15, $math->clamp(15, 10, 20));
        self::assertSame(20, $math->clamp(25, 10, 20));
    }

    public function testMultiplyByFactor(): void
    {
        $math = $this->math();

        self::assertSame(1500, $math->multiplyByFactor(1000, 1_500_000));
        self::assertSame(1250, $math->multiplyByFactor(1000, 1_250_000));
        self::assertSame(-1500, $math->multiplyByFactor(-1000, 1_500_000));
    }

    public function testDivideWithFixedScale(): void
    {
        $math = $this->math();

        self::assertSame(500_000, $math->divide(1, 2));
        self::assertSame(333_333, $math->divide(1, 3));
        self::assertSame(666_667, $math->divide(2, 3));
    }

    public function testDivideRoundingModes(): void
    {
        $math = $this->math();

        self::assertSame(2, $math->divide(5, 2, 1, RoundingMode::Floor));
        self::assertSame(3, $math->divide(5, 2, 1, RoundingMode::Ceiling));
        self::assertSame(2, $math->divide(5, 2, 1, RoundingMode::TowardsZero));
        self::assertSame(3, $math->divide(5, 2, 1, RoundingMode::HalfUp));
        self::assertSame(2, $math->divide(5, 2, 1, RoundingMode::HalfDown));

        self::assertSame(-3, $math->divide(-5, 2, 1, RoundingMode::Floor));
        self::assertSame(-2, $math->divide(-5, 2, 1, RoundingMode::Ceiling));
        self::assertSame(-2, $math->divide(-5, 2, 1, RoundingMode::TowardsZero));
        self::assertSame(-3, $math->divide(-5, 2, 1, RoundingMode::HalfUp));
        self::assertSame(-2, $math->divide(-5, 2, 1, RoundingMode::HalfDown));
    }

    public function testThrowsExceptionOnDivisionByZero(): void
    {
        $math = $this->math();

        $this->expectException(RuntimeException::class);

        $math->divide(1, 0);
    }

    public function testThrowsExceptionOnInvalidScale(): void
    {
        $math = $this->math();

        $this->expectException(InvalidArgumentException::class);

        $math->divide(1, 2, 0);
    }

    public function testConvertsFloatToFixedAndBack(): void
    {
        $math = $this->math();

        $fixed = $math->fromFloat(1.5, 100);

        self::assertSame(150, $fixed);
        self::assertSame(1.5, $math->toFloat($fixed, 100));
    }
}
