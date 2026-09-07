<?php

declare(strict_types=1);

// src/CoreEngine/Core/MathKernel.php

namespace Project\CoreEngine\Core;

use InvalidArgumentException;
use Project\CoreEngine\Contracts\LoggerInterface;
use Project\CoreEngine\Contracts\MathKernelInterface;
use RuntimeException;

final class MathKernel implements MathKernelInterface
{
    public function __construct(
        private readonly LoggerInterface $logger
    ) {
    }

    public function add(int $left, int $right): int
    {
        if ($right > 0 && $left > PHP_INT_MAX - $right) {
            $this->runtimeError('Integer addition overflow.', [
                'left' => $left,
                'right' => $right,
            ]);
        }

        if ($right < 0 && $left < PHP_INT_MIN - $right) {
            $this->runtimeError('Integer addition underflow.', [
                'left' => $left,
                'right' => $right,
            ]);
        }

        return $left + $right;
    }

    public function subtract(int $left, int $right): int
    {
        if ($right > 0 && $left < PHP_INT_MIN + $right) {
            $this->runtimeError('Integer subtraction underflow.', [
                'left' => $left,
                'right' => $right,
            ]);
        }

        if ($right < 0 && $left > PHP_INT_MAX + $right) {
            $this->runtimeError('Integer subtraction overflow.', [
                'left' => $left,
                'right' => $right,
            ]);
        }

        return $left - $right;
    }

    public function multiply(int $left, int $right): int
    {
        return $this->safeMultiply($left, $right);
    }

    public function multiplyByFactor(
        int $value,
        int $factor,
        int $scale = MathKernelInterface::DEFAULT_SCALE,
        RoundingMode $roundingMode = RoundingMode::HalfUp
    ): int {
        $this->assertScale($scale);

        $numerator = $this->safeMultiply($value, $factor);

        return $this->roundDivision($numerator, $scale, $roundingMode);
    }

    public function divide(
        int $dividend,
        int $divisor,
        int $scale = MathKernelInterface::DEFAULT_SCALE,
        RoundingMode $roundingMode = RoundingMode::HalfUp
    ): int {
        $this->assertScale($scale);

        if ($divisor === 0) {
            $this->runtimeError('Division by zero.', [
                'dividend' => $dividend,
                'divisor' => $divisor,
                'scale' => $scale,
            ]);
        }

        $numerator = $this->safeMultiply($dividend, $scale);

        return $this->roundDivision($numerator, $divisor, $roundingMode);
    }

    public function clamp(int $value, int $min, int $max): int
    {
        if ($min > $max) {
            $this->invalidArgument('Clamp min value cannot be greater than max value.', [
                'value' => $value,
                'min' => $min,
                'max' => $max,
            ]);
        }

        if ($value < $min) {
            return $min;
        }

        if ($value > $max) {
            return $max;
        }

        return $value;
    }

    public function fromFloat(
        float $value,
        int $scale = MathKernelInterface::DEFAULT_SCALE
    ): int {
        $this->assertScale($scale);

        if (!is_finite($value)) {
            $this->invalidArgument('Float value must be finite.', [
                'value' => $value,
                'scale' => $scale,
            ]);
        }

        $scaled = $value * $scale;

        if (!is_finite($scaled) || $scaled > PHP_INT_MAX || $scaled < PHP_INT_MIN) {
            $this->runtimeError('Float value cannot be converted to integer scale.', [
                'value' => $value,
                'scale' => $scale,
            ]);
        }

        return (int) round($scaled);
    }

    public function toFloat(
        int $value,
        int $scale = MathKernelInterface::DEFAULT_SCALE
    ): float {
        $this->assertScale($scale);

        return $value / $scale;
    }

    private function assertScale(int $scale): void
    {
        if ($scale <= 0) {
            $this->invalidArgument('Numeric scale must be greater than zero.', [
                'scale' => $scale,
            ]);
        }
    }

    private function safeMultiply(int $left, int $right): int
    {
        if ($left === 0 || $right === 0) {
            return 0;
        }

        if ($left > 0 && $right > 0 && $left > intdiv(PHP_INT_MAX, $right)) {
            $this->runtimeError('Integer multiplication overflow.', [
                'left' => $left,
                'right' => $right,
            ]);
        }

        if ($left > 0 && $right < 0 && $right < intdiv(PHP_INT_MIN, $left)) {
            $this->runtimeError('Integer multiplication underflow.', [
                'left' => $left,
                'right' => $right,
            ]);
        }

        if ($left < 0 && $right > 0 && $left < intdiv(PHP_INT_MIN, $right)) {
            $this->runtimeError('Integer multiplication underflow.', [
                'left' => $left,
                'right' => $right,
            ]);
        }

        if ($left < 0 && $right < 0) {
            if ($left === PHP_INT_MIN || $right === PHP_INT_MIN) {
                $this->runtimeError('Integer multiplication overflow.', [
                    'left' => $left,
                    'right' => $right,
                ]);
            }

            $absLeft = -$left;
            $absRight = -$right;

            if ($absLeft > intdiv(PHP_INT_MAX, $absRight)) {
                $this->runtimeError('Integer multiplication overflow.', [
                    'left' => $left,
                    'right' => $right,
                ]);
            }
        }

        return $left * $right;
    }

    private function roundDivision(
        int $numerator,
        int $denominator,
        RoundingMode $roundingMode
    ): int {
        if ($denominator === 0) {
            $this->runtimeError('Division by zero.', [
                'numerator' => $numerator,
                'denominator' => $denominator,
            ]);
        }

        if ($denominator === PHP_INT_MIN) {
            $this->runtimeError('Denominator PHP_INT_MIN is not supported for rounding division.', [
                'numerator' => $numerator,
                'denominator' => $denominator,
            ]);
        }

        if ($numerator === PHP_INT_MIN && $denominator === -1) {
            $this->runtimeError('Integer division overflow.', [
                'numerator' => $numerator,
                'denominator' => $denominator,
            ]);
        }

        $quotient = intdiv($numerator, $denominator);
        $remainder = $numerator - ($quotient * $denominator);

        if ($remainder === 0) {
            return $quotient;
        }

        if ($remainder === PHP_INT_MIN) {
            $this->runtimeError('Unsupported remainder for rounding division.', [
                'numerator' => $numerator,
                'denominator' => $denominator,
            ]);
        }

        $absRemainder = $remainder > 0 ? $remainder : -$remainder;
        $absDenominator = $denominator > 0 ? $denominator : -$denominator;

        $isPositiveResult = ($numerator >= 0 && $denominator > 0)
            || ($numerator <= 0 && $denominator < 0);

        return match ($roundingMode) {
            RoundingMode::Floor => $isPositiveResult
                ? $quotient
                : $quotient - 1,

            RoundingMode::Ceiling => $isPositiveResult
                ? $quotient + 1
                : $quotient,

            RoundingMode::TowardsZero => $quotient,

            RoundingMode::HalfUp => $this->adjustForHalf(
                $quotient,
                $absRemainder,
                $absDenominator,
                $isPositiveResult,
                true
            ),

            RoundingMode::HalfDown => $this->adjustForHalf(
                $quotient,
                $absRemainder,
                $absDenominator,
                $isPositiveResult,
                false
            ),
        };
    }

    private function adjustForHalf(
        int $quotient,
        int $absRemainder,
        int $absDenominator,
        bool $isPositiveResult,
        bool $roundHalfUp
    ): int {
        $threshold = $absDenominator - $absRemainder;

        $shouldAdjust = $roundHalfUp
            ? $absRemainder >= $threshold
            : $absRemainder > $threshold;

        if (!$shouldAdjust) {
            return $quotient;
        }

        return $isPositiveResult ? $quotient + 1 : $quotient - 1;
    }

    /**
     * @param array<string, mixed> $context
     */
    private function invalidArgument(string $message, array $context): never
    {
        $this->logger->error($message, $context);

        throw new InvalidArgumentException($message);
    }

    /**
     * @param array<string, mixed> $context
     */
    private function runtimeError(string $message, array $context): never
    {
        $this->logger->error($message, $context);

        throw new RuntimeException($message);
    }
}
