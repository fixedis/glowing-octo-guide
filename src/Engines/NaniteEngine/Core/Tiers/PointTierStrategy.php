<?php

declare(strict_types=1);

// src/Engines/NaniteEngine/Core/Tiers/PointTierStrategy.php
//
// ТИР POINT — 1–3 px точка на небе (звезда/галактика вдали).
// Комплементарен billboard: вес 1 при screenPx=0 (максимально «точка») и
// падает до 0 в диапазоне [0, BLEND_PX]. Это обратная логика к базовому
// smoothstep-росту, поэтому weight() переопределён.

namespace Project\Engines\NaniteEngine\Core\Tiers;

final class PointTierStrategy extends AbstractTierStrategy
{
    protected const THRESHOLD_PX = 0;
    protected const BLEND_PX = 24;

    public function tierName(): string
    {
        return 'point';
    }

    public function weight(int $screenPx, int $baseRadius): int
    {
        // Чем меньше экранный размер, тем «точечнее» тело.
        if ($screenPx <= 0) {
            return 1000;
        }

        $upper = static::BLEND_PX;

        if ($screenPx >= $upper) {
            return 0;
        }

        $scale = 1000;

        return (int) ((($upper - $screenPx) * $scale) / $upper);
    }
}
