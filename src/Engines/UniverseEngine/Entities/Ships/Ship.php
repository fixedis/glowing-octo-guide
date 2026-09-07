<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Entities/Ships/Ship.php

namespace Project\Engines\UniverseEngine\Entities\Ships;

use Project\Engines\UniverseEngine\Contracts\IUniverseEntity;

/**
 * Игровая сущность корабля (данные, не экземпляр рендера).
 */
final class Ship implements IUniverseEntity
{
    public const CLASS_SCOUT = 'scout';
    public const CLASS_FREIGHTER = 'freighter';
    public const CLASS_WARShip = 'warship';

    public const CLASSES = [
        self::CLASS_SCOUT,
        self::CLASS_FREIGHTER,
        self::CLASS_WARShip,
    ];

    public function __construct(
        public readonly int $seed,
        public readonly string $shipClass,
        public readonly int $x,
        public readonly int $y,
        public readonly int $z,
        public readonly int $ownerColonySeed
    ) {
    }

    public function entityId(): string
    {
        return 'ship_' . $this->seed;
    }

    public function seed(): int
    {
        return $this->seed;
    }

    /**
     * @return array<string, int|string>
     */
    public function toArray(): array
    {
        return [
            'seed' => $this->seed,
            'shipClass' => $this->shipClass,
            'x' => $this->x,
            'y' => $this->y,
            'z' => $this->z,
            'ownerColonySeed' => $this->ownerColonySeed,
        ];
    }
}
