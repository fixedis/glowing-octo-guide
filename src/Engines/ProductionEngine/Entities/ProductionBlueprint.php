<?php

declare(strict_types=1);

// src/Engines/ProductionEngine/Entities/ProductionBlueprint.php

namespace Project\Engines\ProductionEngine\Entities;

/**
 * Таблица типов производимых объектов и их базовых стоимостей.
 *
 * Детерминированная, неизменяемая (нет RNG — см. REMARKS п.2: движок может
 * использовать детерминированный расчёт, а не собственный RNG). Стоимость
 * задана в тех же fixed-point единицах, что и `economy.colony.*.stored`.
 *
 * Типы построек и юнитов — данные, не экземпляры рендера.
 */
final class ProductionBlueprint
{
    public const TYPE_HABITAT = 'habitat';
    public const TYPE_FACTORY = 'factory';
    public const TYPE_REACTOR = 'reactor';
    public const TYPE_SHIP_HULL = 'ship_hull';
    public const TYPE_DRONE = 'drone';

    /** @var array<string, int> Базовая стоимость по типу постройки. */
    private const BUILDING_COSTS = [
        self::TYPE_HABITAT => 500_000,
        self::TYPE_FACTORY => 1_200_000,
        self::TYPE_REACTOR => 2_000_000,
    ];

    /** @var array<string, int> Базовая стоимость по типу юнита. */
    private const UNIT_COSTS = [
        self::TYPE_SHIP_HULL => 800_000,
        self::TYPE_DRONE => 300_000,
    ];

    /** @var list<string> */
    public const BUILDING_TYPES = [self::TYPE_HABITAT, self::TYPE_FACTORY, self::TYPE_REACTOR];

    /** @var list<string> */
    public const UNIT_TYPES = [self::TYPE_SHIP_HULL, self::TYPE_DRONE];

    /**
     * Возвращает базовую стоимость типа (постройки или юнита).
     *
     * @throws \InvalidArgumentException если тип неизвестен.
     */
    public static function baseCost(string $type): int
    {
        if (array_key_exists($type, self::BUILDING_COSTS)) {
            return self::BUILDING_COSTS[$type];
        }

        if (array_key_exists($type, self::UNIT_COSTS)) {
            return self::UNIT_COSTS[$type];
        }

        throw new \InvalidArgumentException(sprintf('Unknown production type "%s".', $type));
    }

    public static function isBuilding(string $type): bool
    {
        return in_array($type, self::BUILDING_TYPES, true);
    }

    public static function isUnit(string $type): bool
    {
        return in_array($type, self::UNIT_TYPES, true);
    }
}
