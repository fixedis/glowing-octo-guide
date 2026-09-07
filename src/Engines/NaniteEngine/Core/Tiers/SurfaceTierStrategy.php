<?php

declare(strict_types=1);

// src/Engines/NaniteEngine/Core/Tiers/SurfaceTierStrategy.php
//
// ТИР SURFACE — полная процедурная геометрия (нанит-квадтри, облака, кольца).
// Активен, пока тело крупнее surfaceOff порога; ниже него кроссфейдит в billboard.

namespace Project\Engines\NaniteEngine\Core\Tiers;

final class SurfaceTierStrategy extends AbstractTierStrategy
{
    protected const THRESHOLD_PX = 120;
    protected const BLEND_PX = 60;

    public function tierName(): string
    {
        return 'surface';
    }
}
