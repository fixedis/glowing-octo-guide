<?php

declare(strict_types=1);

// src/Engines/FleetEngine/Entities/FleetBlueprint.php

namespace Project\Engines\FleetEngine\Entities;

/**
 * Таблица категорий флотов и базовых пространственных параметров.
 *
 * Детерминированная, неизменяемая (нет RNG — см. rules.md «Числа» п.5/7:
 * движок использует детерминированный расчёт, а не собственный RNG).
 * Координаты и радиусы заданы в тех же целочисленных (fixed-point) единицах,
 * что и у UniverseEngine (MAX_COORD = 5_000_000).
 *
 * Данные, не игровые экземпляры (см. rules.md «Сущности» п.4-5).
 */
final class FleetBlueprint
{
    public const TYPE_EXPLORATION = 'exploration';
    public const TYPE_TRANSPORT = 'transport';
    public const TYPE_STRIKE = 'strike';

    /** @var list<string> */
    public const FLEET_TYPES = [
        self::TYPE_EXPLORATION,
        self::TYPE_TRANSPORT,
        self::TYPE_STRIKE,
    ];

    /**
     * Радиус десанта (чебышёвское расстояние по осям) в единицах координат.
     * Флот может высадиться, только если находится в пределах этого радиуса
     * от целевой планеты.
     */
    public const DISEMBARK_RADIUS = 100_000;

    /**
     * Границы координат (наследуются от контракта UniverseEngine SpawnShip/SpawnPlanet).
     */
    public const MAX_COORD = 5_000_000;

    /**
     * Возвращает true, если категория флота допустима.
     */
    public static function isFleetType(string $type): bool
    {
        return in_array($type, self::FLEET_TYPES, true);
    }

    /**
     * Нормализует координату в допустимые границы.
     */
    public static function clampCoord(int $value): int
    {
        if ($value > self::MAX_COORD) {
            return self::MAX_COORD;
        }

        if ($value < -self::MAX_COORD) {
            return -self::MAX_COORD;
        }

        return $value;
    }

    /**
     * Чебышёвское расстояние между двумя точками (детерминировано, целочисленно).
     *
     * @param array{x: int, y: int, z: int} $a
     * @param array{x: int, y: int, z: int} $b
     */
    public static function chebyshevDistance(array $a, array $b): int
    {
        $dx = abs($a['x'] - $b['x']);
        $dy = abs($a['y'] - $b['y']);
        $dz = abs($a['z'] - $b['z']);

        return max($dx, $dy, $dz);
    }
}
