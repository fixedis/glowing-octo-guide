<?php

declare(strict_types=1);

// src/Engines/NaniteEngine/Core/NaniteBudgetDirector.php
//
// ДИРЕКТОР ЭКРАННОГО БЮДЖЕТА (ядро нанит-принципа).
//
// НЕ знает предметной области И НЕ ОТСВЕЧИВАЕТ ЗА ГРАФИКУ: никаких
// треугольников/полигонов здесь нет. Сервер считает только логический
// бюджет представления:
//   - веса тиров (surface/billboard/point) через стратегии;
//   - активный тир (максимальный вес);
//   - бюджет стриминга (тело загружено, если в кадре и в иерархическом окне);
//   - бюджет симуляции (симуляция разрешена только фокусу и крупным телам).
//
// Реальную геометрию (квадтри, треугольники по zoom) считает клиент.

namespace Project\Engines\NaniteEngine\Core;

use Project\Engines\NaniteEngine\Contracts\NaniteEntityInterface;
use Project\Engines\NaniteEngine\Contracts\TierStrategyInterface;

final class NaniteBudgetDirector
{
    /** Максимум одновременно «загруженных» (стриминг) тел. */
    public const STREAMING_BUDGET = 256;

    /** Максимум тел с активной симуляцией за кадр. */
    public const SIMULATION_BUDGET = 64;

    /**
     * @param list<TierStrategyInterface> $tiers стратегии тиров (порядок важен:
     *        surface -> billboard -> point)
     */
    public function __construct(
        private readonly array $tiers,
        private readonly int $streamingBudget = self::STREAMING_BUDGET,
        private readonly int $simulationBudget = self::SIMULATION_BUDGET
    ) {
    }

    /**
     * @param list<NaniteEntityInterface> $entities
     * @return array<string, NaniteEntityResult>
     */
    public function evaluate(array $entities, ?string $focusId = null): array
    {
        $results = [];
        $streamingUsed = 0;
        $simulationUsed = 0;

        foreach ($entities as $entity) {
            $id = $entity->naniteEntityId();
            $screenPx = \max(0, $entity->naniteScreenPx());
            $baseRadius = \max(1, $entity->naniteBaseRadius());

            $surface = $this->tierWeight('surface', $screenPx, $baseRadius);
            $billboard = $this->tierWeight('billboard', $screenPx, $baseRadius);
            $point = $this->tierWeight('point', $screenPx, $baseRadius);

            $activeTier = $this->pickActiveTier($surface, $billboard, $point);

            // Стриминг: тело в кадре (px > 0) и не превысили бюджет.
            $streamed = $screenPx > 0 && $streamingUsed < $this->streamingBudget;
            if ($streamed) {
                $streamingUsed++;
            }

            // Симуляция: только фокус ИЛИ (тело крупное И бюджет не исчерпан).
            // «Включённые слои» эмулируются флагом allowSimulation внешним
            // конфигом; здесь — детерминированное правило ядра.
            $largeEnough = $screenPx >= 120;
            $simulated = $id === $focusId
                || ($largeEnough && $simulationUsed < $this->simulationBudget);
            if ($simulated) {
                $simulationUsed++;
            }

            $results[$id] = new NaniteEntityResult(
                $id,
                $screenPx,
                $surface,
                $billboard,
                $point,
                $activeTier,
                $streamed,
                $simulated
            );
        }

        return $results;
    }

    private function tierWeight(string $name, int $screenPx, int $baseRadius): int
    {
        foreach ($this->tiers as $tier) {
            if ($tier->tierName() === $name) {
                return $tier->weight($screenPx, $baseRadius);
            }
        }

        return 0;
    }

    private function pickActiveTier(int $surface, int $billboard, int $point): string
    {
        // При равенстве приоритет: surface > billboard > point.
        if ($surface >= $billboard && $surface >= $point && $surface > 0) {
            return 'surface';
        }

        if ($billboard >= $point && $billboard > 0) {
            return 'billboard';
        }

        if ($point > 0) {
            return 'point';
        }

        // Тело вне всех тиров (экранный размер ~0): точка-заглушка.
        return 'point';
    }
}
