<?php

declare(strict_types=1);

// src/Engines/NaniteEngine/Contracts/TierStrategyInterface.php
//
// СТРАТЕГИЯ ТИРА ПРЕДСТАВЛЕНИЯ.
//
// Каждая стратегия отвечает за ОДИН уровень детализации (surface/billboard/
// point). Паттерн Strategy: решение о принадлежности тела к тиру и расчёт
// «веса» (прозрачности/интенсивности) вынесено в отдельный класс, чтобы
// набор тиров можно было менять без правки директора бюджета.

namespace Project\Engines\NaniteEngine\Contracts;

interface TierStrategyInterface
{
    /** Имя тира (используется в событиях и снапшотах). */
    public function tierName(): string;

    /**
     * Нижняя граница экранных пикселей (включительно), начиная с которой
     * тир считается «активным» для данного тела.
     *
     * @param int $baseRadius эталонный радиус тела
     */
    public function thresholdPx(int $baseRadius): int;

    /**
     * Непрерывный вес тира в диапазоне [0, 1] для данного экранного размера.
     * Используется для кроссфейдных переходов между тирами (smoothstep).
     */
    public function weight(int $screenPx, int $baseRadius): int;
}
