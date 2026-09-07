<?php

declare(strict_types=1);

// src/Engines/EconomyEngine/Contracts/IEconomyEntity.php

namespace Project\Engines\EconomyEngine\Contracts;

/**
 * Контракт экономической сущности движка.
 *
 * Сущности движка отделены от ядра движка (правило архитектуры).
 */
interface IEconomyEntity
{
    public function entityId(): string;

    public function economySeed(): int;
}
