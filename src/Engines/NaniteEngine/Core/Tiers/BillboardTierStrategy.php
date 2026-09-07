<?php

declare(strict_types=1);

// src/Engines/NaniteEngine/Core/Tiers/BillboardTierStrategy.php
//
// ТИР BILLBOARD — глоу-спрайт / импост. Средний диапазон экранных размеров:
// растёт от threshold до верхней границы, затем СПАДАЕТ к 0 (крупное тело
// уходит в surface, мелкое — в point). Поэтому weight() переопределён.

namespace Project\Engines\NaniteEngine\Core\Tiers;

final class BillboardTierStrategy extends AbstractTierStrategy
{
    protected const THRESHOLD_PX = 24;
    protected const BLEND_PX = 40;

    public function tierName(): string
    {
        return 'billboard';
    }

    public function weight(int $screenPx, int $baseRadius): int
    {
        $threshold = $this->thresholdPx($baseRadius);
        $upper = $threshold + static::BLEND_PX;

        if ($screenPx <= $threshold) {
            return 0;
        }

        // Пик тира — на верхней границе; выше неё спадает к 0.
        if ($screenPx >= $upper * 2) {
            return 0;
        }

        if ($screenPx <= $upper) {
            // Рост от threshold до upper.
            return (int) (($screenPx - $threshold) * 1000 / ($upper - $threshold));
        }

        // Спад от upper до 2*upper.
        return (int) ((($upper * 2 - $screenPx) * 1000) / $upper);
    }
}
