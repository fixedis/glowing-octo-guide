<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Core/SeedGraph.php

namespace Project\Engines\UniverseEngine\Core;

use Closure;

/**
 * Детерминированный генератор seed-ов и RNG из пути.
 * Алгоритм FNV-1a + mulberry32 идентичен на PHP и TypeScript.
 */
final class SeedGraph
{
    private const FNV_OFFSET = 2166136261;
    private const FNV_PRIME = 16777619;

    public function hash(string $path): int
    {
        $hash = self::FNV_OFFSET;
        $length = strlen($path);

        for ($i = 0; $i < $length; $i++) {
            $hash ^= ord($path[$i]);
            $hash = ($hash * self::FNV_PRIME) & 0xFFFFFFFF;
        }

        return $hash;
    }

    public function hashInts(int ...$values): int
    {
        return $this->hash(implode('|', $values));
    }

    public function rng(string $path): Closure
    {
        return self::mulberry32(self::toInt32($this->hash($path)));
    }

    public static function mulberry32(int $seed): Closure
    {
        $state = self::toInt32($seed);

        return function () use (&$state): float {
            $state = self::toInt32($state + 0x6D2B79F5);

            $t = self::imul($state ^ self::ushr($state, 15), 1 | $state);
            $t = self::toInt32($t + self::imul($t ^ self::ushr($t, 7), 61 | $t)) ^ $t;

            return self::ushr($t ^ self::ushr($t, 14), 0) / 4294967296.0;
        };
    }

    private static function ushr(int $value, int $shift): int
    {
        return ($value & 0xFFFFFFFF) >> $shift;
    }

    private static function toInt32(int $value): int
    {
        $value &= 0xFFFFFFFF;

        if ($value >= 0x80000000) {
            $value -= 0x100000000;
        }

        return $value;
    }

    private static function imul(int $a, int $b): int
    {
        $a = self::toInt32($a);
        $b = self::toInt32($b);

        $ah = ($a >> 16) & 0xFFFF;
        $al = $a & 0xFFFF;
        $bh = ($b >> 16) & 0xFFFF;
        $bl = $b & 0xFFFF;

        $high = (($ah * $bl + $al * $bh) & 0xFFFF);

        return self::toInt32(($high << 16) + $al * $bl);
    }
}
