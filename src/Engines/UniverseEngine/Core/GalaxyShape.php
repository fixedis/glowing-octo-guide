<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Core/GalaxyShape.php

namespace Project\Engines\UniverseEngine\Core;

/**
 * Детерминированная форма спиральной галактики MORTIS.
 *
 * Порядок потребления rng ИДЕНТИЧЕН TypeScript-классу
 * client/src/core/galaxy-shape.ts. Именно это гарантирует, что звёздные
 * системы (генерация здесь, на PHP) лежат ровно на тех же спиралях рукавов,
 * что и частицы визуала (TS). Ни одной «оторванной» системы.
 */
final class GalaxyShape
{
    public function __construct(
        public readonly int $arms,
        public readonly float $twist,
        public readonly float $armWidthBase,
        public readonly float $armWidthGrow,
        public readonly float $meanderFast,
        public readonly float $meanderSlow,
        public readonly float $feather,
        public readonly int $spinSign,
        public readonly float $spinSpeed,
        public readonly float $vortexRadius,
        public readonly float $vortexDepth,
        public readonly float $vortexWind,
        public readonly float $vortexSpin,
        public readonly int $paletteIndex,
        public readonly float $twinkleAmp,
        public readonly float $embersDrift,
        public readonly float $embersSpeed,
        public readonly float $bgBand,
    ) {
    }

    public static function create(SeedGraph $seedGraph, int $seed): self
    {
        $rng = $seedGraph->rng('galaxy/' . $seed . '/mortis');

        // 1..7 — геометрия рукавов (используется и на TS).
        $arms = 1 + (int) floor($rng() * 5);
        $twist = 0.02 + $rng() * 0.28;
        $armWidthBase = 0.4 + $rng() * 3.6;
        $armWidthGrow = $rng() * 0.85;
        $meanderFast = $rng() * 4.0;
        $meanderSlow = $rng() * 22.0;
        $feather = $rng();
        // 8..13 — вращение и воронка.
        $spinSignDraw = $rng() < 0.5 ? -1 : 1;
        $spinSpeedRaw = 0.005 + $rng() * 0.075;
        $vortexRadius = 3.0 + $rng() * 77.0;
        $vortexDepth = 0.1 + $rng() * 14.9;
        $vortexWind = $rng() * 0.6;
        $vortexSpinRaw = 0.005 + $rng() * 0.075;
        // НАПРАВЛЕНИЕ ВРАЩЕНИЯ ИЗ ГЕОМЕТРИИ (синхронно с client/galaxy-shape.ts):
        // твикл > 0 наматывает рукава наружу против часовой => диск течёт
        // ПО часовой («вкручивается» к центру). Мини-воронка — СВОЙ знак.
        $spinSign = 1;
        $spinSpeed = $spinSpeedRaw * $spinSign;
        $vortexSpin = $vortexSpinRaw * $spinSignDraw;
        // 14..18 — визуальные параметры (PHP потребляет «вхолостую»).
        $paletteIndex = min(4, (int) floor($rng() * 5));
        $twinkleAmp = $rng() * 0.12;
        $embersDrift = 0.2 + $rng() * 1.3;
        $embersSpeed = 0.2 + $rng() * 1.0;
        $bgBand = 0.2 + $rng() * 0.5;

        return new self(
            $arms,
            $twist,
            $armWidthBase,
            $armWidthGrow,
            $meanderFast,
            $meanderSlow,
            $feather,
            $spinSign,
            $spinSpeed,
            $vortexRadius,
            $vortexDepth,
            $vortexWind,
            $vortexSpin,
            $paletteIndex,
            $twinkleAmp,
            $embersDrift,
            $embersSpeed,
            $bgBand
        );
    }

    /** Меандр: поперечный изгиб осевой линии рукава (порт armCenterOff). */
    public function armCenterOffset(float $r, int $arm): float
    {
        $m = min($r / 16, 1);

        return (
            sin($r * 0.09 + $arm * 2.4) * $this->meanderFast
            + sin($r * 0.023 + $arm * 0.7 + 1.3) * $this->meanderSlow
        ) * $m;
    }

    /** Ширина рукава на радиусе r (порт armWidth). */
    public function armWidth(float $r, int $arm): float
    {
        $w = $this->armWidthBase + $r * $this->armWidthGrow;
        $mod = 0.65 + 0.7 * (0.5 + 0.5 * sin($r * 0.07 + $arm * 1.7 + 0.4));

        return $w * $mod;
    }

    /** Полярный угол точки рукава при смещении lateral от осевой линии. */
    public function armAngle(float $r, int $arm, float $lateral): float
    {
        return ($arm / $this->arms) * 2 * M_PI + $r * $this->twist + $lateral / max($r, 1e-6);
    }
}
