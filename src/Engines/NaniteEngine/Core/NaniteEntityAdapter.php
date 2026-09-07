<?php

declare(strict_types=1);

// src/Engines/NaniteEngine/Core/NaniteEntityAdapter.php
//
// АДАПТЕР СЫРЫХ ДАННЫХ К КОНТРАКТУ NaniteEntityInterface.
//
// Позволяет любому домену (UniverseEngine, визуальный конструктор) отдавать
// тела в NaniteEngine как плоские данные, не имплементируя интерфейс в своей
// сущности. Граничная валидация входа — зона ответственности хендлера.

namespace Project\Engines\NaniteEngine\Core;

use Project\Engines\NaniteEngine\Contracts\NaniteEntityInterface;

final class NaniteEntityAdapter implements NaniteEntityInterface
{
    public function __construct(
        private readonly string $entityId,
        private readonly int $screenPx,
        private readonly int $baseRadius
    ) {
    }

    public function naniteEntityId(): string
    {
        return $this->entityId;
    }

    public function naniteScreenPx(): int
    {
        return $this->screenPx;
    }

    public function naniteBaseRadius(): int
    {
        return $this->baseRadius;
    }
}
