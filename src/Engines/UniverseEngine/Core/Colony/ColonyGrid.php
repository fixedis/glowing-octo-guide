<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Core/Colony/ColonyGrid.php

namespace Project\Engines\UniverseEngine\Core\Colony;

/**
 * Координатная сетка колонии на кубосфере: (face, x, y) на глубине depth.
 */
final class ColonyGrid
{
    public const MAX_DEPTH = 8;

    public static function side(int $depth): int
    {
        return 1 << $depth;
    }

    public static function isValidCell(int $face, int $x, int $y, int $depth): bool
    {
        if ($face < 0 || $face > 5) {
            return false;
        }

        if ($depth < 0 || $depth > self::MAX_DEPTH) {
            return false;
        }

        $side = self::side($depth);

        return $x >= 0 && $x < $side && $y >= 0 && $y < $side;
    }
}
