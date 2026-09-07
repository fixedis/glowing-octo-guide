<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Entities/Galaxies/Galaxy.php

namespace Project\Engines\UniverseEngine\Entities\Galaxies;

use Project\Engines\UniverseEngine\Contracts\IUniverseEntity;

final class Galaxy implements IUniverseEntity
{
    public const TYPE_SPIRAL = 'spiral';
    public const TYPE_ELLIPTICAL = 'elliptical';
    public const TYPE_IRREGULAR = 'irregular';

    public function __construct(
        public readonly int $seed,
        public readonly string $name,
        public readonly string $type,
        public readonly int $x,
        public readonly int $y,
        public readonly int $z,
        public readonly int $radius
    ) {
    }

    public function entityId(): string
    {
        return 'galaxy_' . $this->seed;
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
            'name' => $this->name,
            'type' => $this->type,
            'x' => $this->x,
            'y' => $this->y,
            'z' => $this->z,
            'radius' => $this->radius,
        ];
    }
}
