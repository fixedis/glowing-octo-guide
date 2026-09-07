<?php

declare(strict_types=1);

// src/Engines/NaniteEngine/Core/NaniteEntityResult.php
//
// РЕЗУЛЬТАТ ОЦЕНКИ ОДНОГО ТЕЛА ЗА КАДР.
//
// Иммутабельный DTO: директор бюджета заполняет его и отдаёт дальше
// (в событие/снапшот). Все веса — целые в диапазоне [0,1] (фиксированная
// точка, как MathKernel::DEFAULT_SCALE).

namespace Project\Engines\NaniteEngine\Core;

final class NaniteEntityResult
{
    /**
     * @param int $surfaceWeight [0,1000]
     * @param int $billboardWeight [0,1000]
     * @param int $pointWeight [0,1000]
     * @param string $activeTier имя тира с максимальным весом
     * @param bool $streamed тело загружено в память (в бюджете стриминга)
     * @param bool $simulated симуляция тира разрешена (в бюджете симуляции)
     */
    public function __construct(
        public readonly string $entityId,
        public readonly int $screenPx,
        public readonly int $surfaceWeight,
        public readonly int $billboardWeight,
        public readonly int $pointWeight,
        public readonly string $activeTier,
        public readonly bool $streamed,
        public readonly bool $simulated
    ) {
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'entityId' => $this->entityId,
            'screenPx' => $this->screenPx,
            'surfaceWeight' => $this->surfaceWeight,
            'billboardWeight' => $this->billboardWeight,
            'pointWeight' => $this->pointWeight,
            'activeTier' => $this->activeTier,
            'streamed' => $this->streamed,
            'simulated' => $this->simulated,
        ];
    }
}
