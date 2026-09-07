<?php

declare(strict_types=1);

// src/Engines/EconomyEngine/Entities/ColonyEconomy.php

namespace Project\Engines\EconomyEngine\Entities;

use Project\Engines\EconomyEngine\Contracts\IEconomyEntity;

/**
 * Экономическое описание колонии.
 *
 * Это доменная сущность (blueprint), а не экземпляр состояния.
 * Реальные запасы живут в CoreEngine State, ключённые по planetSeed.
 */
final class ColonyEconomy implements IEconomyEntity
{
    public function __construct(
        private readonly int $planetSeed,
        private readonly int $baseYield
    ) {
    }

    public function entityId(): string
    {
        return 'colony_econ_' . $this->planetSeed;
    }

    public function economySeed(): int
    {
        return $this->planetSeed;
    }

    public function baseYield(): int
    {
        return $this->baseYield;
    }
}
