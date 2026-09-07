<?php

declare(strict_types=1);

// src/CoreEngine/Core/DeterministicRandom.php

namespace Project\CoreEngine\Core;

use InvalidArgumentException;
use Project\CoreEngine\Contracts\DeterministicRandomInterface;
use Project\CoreEngine\Contracts\LoggerInterface;
use Project\CoreEngine\Contracts\MathKernelInterface;
use RuntimeException;

final class DeterministicRandom implements DeterministicRandomInterface
{
    private int $counter = 0;

    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly string $seed,
        private int $tick = 0
    ) {
        if (trim($seed) === '') {
            $this->invalidArgument('Random seed cannot be empty.', [
                'seed' => $seed,
            ]);
        }

        if ($tick < 0) {
            $this->invalidArgument('Random tick cannot be negative.', [
                'tick' => $tick,
            ]);
        }
    }

    public function setTick(int $tick): void
    {
        if ($tick < 0) {
            $this->invalidArgument('Random tick cannot be negative.', [
                'tick' => $tick,
            ]);
        }

        $this->tick = $tick;
        $this->counter = 0;

        $this->logger->debug('Deterministic random tick changed.', [
            'seed' => $this->seed,
            'tick' => $tick,
        ]);
    }

    public function nextInt(
        int $min,
        int $max,
        string $scope = 'default'
    ): int {
        $this->validateScope($scope);

        if ($min > $max) {
            $this->invalidArgument('Random min value cannot be greater than max value.', [
                'min' => $min,
                'max' => $max,
                'scope' => $scope,
            ]);
        }

        if ($min === PHP_INT_MIN && $max === PHP_INT_MAX) {
            $this->runtimeError('Full integer range is not supported.', [
                'min' => $min,
                'max' => $max,
                'scope' => $scope,
            ]);
        }

        if ($min < 0 && $max > PHP_INT_MAX + $min) {
            $this->runtimeError('Integer range is too large.', [
                'min' => $min,
                'max' => $max,
                'scope' => $scope,
            ]);
        }

        $range = $max - $min;

        if ($range === PHP_INT_MAX) {
            $this->runtimeError('Integer range is too large.', [
                'min' => $min,
                'max' => $max,
                'scope' => $scope,
            ]);
        }

        if ($range === 0) {
            return $min;
        }

        $value = $this->generatePositive($scope);

        return $min + ($value % ($range + 1));
    }

    public function nextFixed(
        string $scope = 'default',
        int $scale = MathKernelInterface::DEFAULT_SCALE
    ): int {
        $this->validateScope($scope);

        if ($scale <= 0) {
            $this->invalidArgument('Random scale must be greater than zero.', [
                'scale' => $scale,
                'scope' => $scope,
            ]);
        }

        if ($scale === PHP_INT_MAX) {
            $this->runtimeError('Random scale is too large.', [
                'scale' => $scale,
                'scope' => $scope,
            ]);
        }

        $value = $this->generatePositive($scope);

        return $value % ($scale + 1);
    }

    public function chance(
        int $probability,
        string $scope = 'default',
        int $scale = MathKernelInterface::DEFAULT_SCALE
    ): bool {
        $this->validateScope($scope);

        if ($scale <= 0) {
            $this->invalidArgument('Random scale must be greater than zero.', [
                'scale' => $scale,
                'scope' => $scope,
            ]);
        }

        if ($probability < 0 || $probability > $scale) {
            $this->invalidArgument('Probability must be between zero and scale.', [
                'probability' => $probability,
                'scale' => $scale,
                'scope' => $scope,
            ]);
        }

        if ($probability === 0) {
            return false;
        }

        if ($probability === $scale) {
            return true;
        }

        $roll = $this->nextFixed($scope, $scale);

        return $roll < $probability;
    }

    private function generatePositive(string $scope): int
    {
        if ($this->counter === PHP_INT_MAX) {
            $this->runtimeError('Deterministic random counter overflow.', [
                'seed' => $this->seed,
                'tick' => $this->tick,
                'scope' => $scope,
            ]);
        }

        $payload = implode('|', [
            $this->seed,
            $scope,
            $this->tick,
            $this->counter,
        ]);

        $this->counter++;

        $binary = hash('sha256', $payload, true);
        $hex = substr(bin2hex($binary), 0, 15);
        $value = hexdec($hex);

        if (!is_int($value)) {
            $this->runtimeError('Deterministic random generated non-integer value.', [
                'seed' => $this->seed,
                'tick' => $this->tick,
                'scope' => $scope,
                'value' => $value,
            ]);
        }

        return $value;
    }

    private function validateScope(string $scope): void
    {
        if (trim($scope) === '') {
            $this->invalidArgument('Random scope cannot be empty.', [
                'scope' => $scope,
            ]);
        }
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
