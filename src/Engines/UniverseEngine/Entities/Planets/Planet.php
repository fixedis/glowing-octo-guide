<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Entities/Planets/Planet.php

namespace Project\Engines\UniverseEngine\Entities\Planets;

use Project\Engines\UniverseEngine\Contracts\IUniverseEntity;

final class Planet implements IUniverseEntity
{
    public const TYPE_TERRAN = 'terran';
    public const TYPE_ICE = 'ice';
    public const TYPE_LAVA = 'lava';
    public const TYPE_GAS = 'gas';
    public const TYPE_MOON = 'moon';

    public function __construct(
        public readonly int $seed,
        public readonly int $index,
        public readonly string $type,
        public readonly int $radiusKm,
        public readonly int $semiMajorAxisAuMilli,
        public readonly int $eccentricityFixed,
        public readonly int $inclinationFixed,
        public readonly string $variant = 'earth_like'
    ) {
    }

    public function entityId(): string
    {
        return 'planet_' . $this->seed;
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
            'index' => $this->index,
            'type' => $this->type,
            'radiusKm' => $this->radiusKm,
            'semiMajorAxisAuMilli' => $this->semiMajorAxisAuMilli,
            'eccentricityFixed' => $this->eccentricityFixed,
            'inclinationFixed' => $this->inclinationFixed,
            'variant' => $this->variant,
        ];
    }
}
