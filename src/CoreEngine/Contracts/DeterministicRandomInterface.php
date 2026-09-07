<?php

declare(strict_types=1);

// src/CoreEngine/Contracts/DeterministicRandomInterface.php

namespace Project\CoreEngine\Contracts;

interface DeterministicRandomInterface
{
    public function setTick(int $tick): void;

    public function nextInt(
        int $min,
        int $max,
        string $scope = 'default'
    ): int;

    public function nextFixed(
        string $scope = 'default',
        int $scale = MathKernelInterface::DEFAULT_SCALE
    ): int;

    public function chance(
        int $probability,
        string $scope = 'default',
        int $scale = MathKernelInterface::DEFAULT_SCALE
    ): bool;
}
