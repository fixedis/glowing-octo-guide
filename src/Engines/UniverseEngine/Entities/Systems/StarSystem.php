<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Entities/Systems/StarSystem.php

namespace Project\Engines\UniverseEngine\Entities\Systems;

use Project\Engines\UniverseEngine\Contracts\IUniverseEntity;

final class StarSystem implements IUniverseEntity
{
    public const SPECTRAL_O = 'O';
    public const SPECTRAL_B = 'B';
    public const SPECTRAL_A = 'A';
    public const SPECTRAL_F = 'F';
    public const SPECTRAL_G = 'G';
    public const SPECTRAL_K = 'K';
    public const SPECTRAL_M = 'M';

    public function __construct(
        public readonly int $seed,
        public readonly string $name,
        public readonly string $spectralType,
        public readonly int $x,
        public readonly int $y,
        public readonly int $z,
        public readonly int $planetCount
    ) {
    }

    public function entityId(): string
    {
        return 'system_' . $this->seed;
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
            'spectralType' => $this->spectralType,
            'x' => $this->x,
            'y' => $this->y,
            'z' => $this->z,
            'planetCount' => $this->planetCount,
        ];
    }
}
