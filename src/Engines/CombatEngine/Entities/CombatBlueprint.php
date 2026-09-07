<?php

declare(strict_types=1);

// src/Engines/CombatEngine/Entities/CombatBlueprint.php

namespace Project\Engines\CombatEngine\Entities;

/**
 * Таблица весов боевых единиц и базовых параметров потерь.
 *
 * Детерминированная, неизменяемая. Веса заданы целыми числами; расчёт силы
 * флота и потерь — целочисленный (fixed-point через MathKernel, см. rules.md
 * «Числа» п.1-4). RNG не используется здесь — исход боя считается в обработчике
 * через DeterministicRandomInterface ядра (rules.md «Числа» п.5/7).
 *
 * Данные, не игровые экземпляры (rules.md «Сущности» п.4-5).
 */
final class CombatBlueprint
{
    /**
     * Вес боевой единицы по типу (типы юнитов совпадают с ProductionEngine).
     */
    public const WEIGHT_DRONE = 1;
    public const WEIGHT_SHIP_HULL = 4;

    /** @var array<string, int> */
    public const UNIT_WEIGHTS = [
        'drone' => self::WEIGHT_DRONE,
        'ship_hull' => self::WEIGHT_SHIP_HULL,
    ];

    /**
     * Доля потерь победителя (fixed-point, scale = MathKernelInterface::DEFAULT_SCALE).
     * Победитель теряет до 10% состава.
     */
    public const WINNER_LOSS_FRACTION = 100_000;

    /**
     * Доля потерь проигравшего (fixed-point). Проигравший теряет до 60% состава.
     */
    public const LOSER_LOSS_FRACTION = 600_000;

    /**
     * Возвращает вес единицы по типу (по умолчанию 1, если тип неизвестен).
     */
    public static function weightOf(string $unitType): int
    {
        return self::UNIT_WEIGHTS[$unitType] ?? 1;
    }
}
