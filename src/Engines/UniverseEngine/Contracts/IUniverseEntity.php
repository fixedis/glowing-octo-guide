<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Contracts/IUniverseEntity.php

namespace Project\Engines\UniverseEngine\Contracts;

interface IUniverseEntity
{
    public function entityId(): string;

    public function seed(): int;
}
