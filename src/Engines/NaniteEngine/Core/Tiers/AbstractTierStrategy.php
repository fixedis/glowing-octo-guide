<?php

declare(strict_types=1);

// src/Engines/NaniteEngine/Core/Tiers/AbstractTierStrategy.php
//
// БАЗОВЫЙ КЛАСС ТИРА.
//
// Общая логика smoothstep-перехода между соседними тирами: вес растёт
// линейно в диапазоне [threshold, threshold + blend] и клиппуется в [0,1].
// Порог нормализуется по радиусу тела (thresholdPx * baseRadius / REF_RADIUS),
// поэтому одни и те же константы работают для звезды диаметром 1e9 м и
// спутника диаметром 1e4 м — как в нанит-философии «экранное расстояние —
// единственная валюта».

namespace Project\Engines\NaniteEngine\Core\Tiers;

use Project\Engines\NaniteEngine\Contracts\TierStrategyInterface;

abstract class AbstractTierStrategy implements TierStrategyInterface
{
    /** Эталонный радиус, к которому привязаны пороги (мировые единицы). */
    protected const REFERENCE_RADIUS = 1000;

    /** Нижний экранный порог тира (px) для эталонного радиуса. */
    protected const THRESHOLD_PX = 0;

    /** Ширина кроссфейдного перехода (px). */
    protected const BLEND_PX = 0;

    public function thresholdPx(int $baseRadius): int
    {
        if ($baseRadius <= 0) {
            return static::THRESHOLD_PX;
        }

        // Масштабируем порог обратно пропорционально радиусу:
        // больше тело -> ниже порог (становится детальным раньше).
        return (int) (static::THRESHOLD_PX * static::REFERENCE_RADIUS / $baseRadius);
    }

    public function weight(int $screenPx, int $baseRadius): int
    {
        $threshold = $this->thresholdPx($baseRadius);
        $upper = $threshold + static::BLEND_PX;

        if ($screenPx <= $threshold) {
            return 0;
        }

        // Тир «удерживает» максимум выше верхней границы (крупное тело =
        // полная детализация этого тира). Это базовое поведение surface.
        if ($upper <= $threshold || $screenPx >= $upper) {
            return 1000;
        }

        // Фиксированная точка: вес в [0,1000] масштабируем к SCALE, чтобы
        // оставаться в целочисленной математике (как MathKernel::DEFAULT_SCALE).
        $scale = 1000;

        return (int) (($screenPx - $threshold) * $scale / ($upper - $threshold));
    }
}
