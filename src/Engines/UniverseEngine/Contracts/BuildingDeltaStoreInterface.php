<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Contracts/BuildingDeltaStoreInterface.php

namespace Project\Engines\UniverseEngine\Contracts;

/**
 * Хранилище игровых дельт построек.
 * Дельта переопределяет процедурную генерацию.
 */
interface BuildingDeltaStoreInterface
{
    public const REMOVED = '__removed__';

    /**
     * @return string|null тип постройки, REMOVED = снесено игроком, null = дельты нет
     */
    public function getDelta(int $planetSeed, int $face, int $x, int $y): ?string;

    public function place(int $planetSeed, int $face, int $x, int $y, string $buildingType): void;

    public function demolish(int $planetSeed, int $face, int $x, int $y): void;
}
