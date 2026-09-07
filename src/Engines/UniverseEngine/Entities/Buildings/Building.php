<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Entities/Buildings/Building.php

namespace Project\Engines\UniverseEngine\Entities\Buildings;

use Project\Engines\UniverseEngine\Contracts\IUniverseEntity;

final class Building implements IUniverseEntity
{
    public const TYPE_DOME = 'dome';
    public const TYPE_EXTRACTOR = 'extractor';
    public const TYPE_POWER = 'power';
    public const TYPE_TURRET = 'turret';
    public const TYPE_TOWER = 'tower';
    public const TYPE_LANDING_PAD = 'landing_pad';

    public const TYPES = [
        self::TYPE_DOME,
        self::TYPE_EXTRACTOR,
        self::TYPE_POWER,
        self::TYPE_TURRET,
        self::TYPE_TOWER,
        self::TYPE_LANDING_PAD,
    ];

    public function __construct(
        public readonly int $seed,
        public readonly int $planetSeed,
        public readonly int $face,
        public readonly int $x,
        public readonly int $y,
        public readonly int $depth,
        public readonly string $type
    ) {
    }

    public function entityId(): string
    {
        return 'building_' . $this->seed;
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
            'planetSeed' => $this->planetSeed,
            'face' => $this->face,
            'x' => $this->x,
            'y' => $this->y,
            'depth' => $this->depth,
            'type' => $this->type,
        ];
    }
}
