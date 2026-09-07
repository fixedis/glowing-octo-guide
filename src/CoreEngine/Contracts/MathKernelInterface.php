<?php

declare(strict_types=1);

// src/CoreEngine/Contracts/MathKernelInterface.php

namespace Project\CoreEngine\Contracts;

use Project\CoreEngine\Core\RoundingMode;

interface MathKernelInterface
{
    public const DEFAULT_SCALE = 1_000_000;

    public function add(int $left, int $right): int;

    public function subtract(int $left, int $right): int;

    public function multiply(int $left, int $right): int;

    public function multiplyByFactor(
        int $value,
        int $factor,
        int $scale = self::DEFAULT_SCALE,
        RoundingMode $roundingMode = RoundingMode::HalfUp
    ): int;

    public function divide(
        int $dividend,
        int $divisor,
        int $scale = self::DEFAULT_SCALE,
        RoundingMode $roundingMode = RoundingMode::HalfUp
    ): int;

    public function clamp(int $value, int $min, int $max): int;

    public function fromFloat(
        float $value,
        int $scale = self::DEFAULT_SCALE
    ): int;

    public function toFloat(
        int $value,
        int $scale = self::DEFAULT_SCALE
    ): float;
}
