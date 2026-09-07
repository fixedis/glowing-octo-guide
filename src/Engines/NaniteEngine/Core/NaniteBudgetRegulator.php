<?php

declare(strict_types=1);

// src/Engines/NaniteEngine/Core/NaniteBudgetRegulator.php
//
// САМОРЕГУЛЯЦИЯ БЮДЖЕТА.
//
// Сервер НЕ считает графику. Регулятор держит только логические бюджеты
// (стриминг / симуляция) в разумных пределах: если занятых слотов мало —
// чуть расширяем, если упёрлись в жёсткий потолок занятости — поджимаем.
// Аналог «саморегуляции targetPx», но в терминах количества тел, а не полигонов.

namespace Project\Engines\NaniteEngine\Core;

use Project\CoreEngine\Contracts\LoggerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Contracts\TickSystemInterface;
use Project\CoreEngine\Core\TickContext;

final class NaniteBudgetRegulator implements TickSystemInterface
{
    public const NAME = 'nanite-budget-regulator';

    /** Доля занятых слотов, выше которой бюджет поджимается. */
    private const OCCUPANCY_HARD = 0.95;

    /** Доля занятых слотов, ниже которой бюджет аккуратно расширяется. */
    private const OCCUPANCY_SOFT = 0.70;

    public function __construct(
        private readonly StateInterface $state,
        private readonly LoggerInterface $logger
    ) {
    }

    public function name(): string
    {
        return self::NAME;
    }

    public function update(TickContext $context): void
    {
        $snapshot = $this->state->get('nanite.snapshot');

        if (!is_array($snapshot)) {
            return;
        }

        $streamingUsed = (int) ($snapshot['streamingBudgetUsed'] ?? 0);
        $simUsed = (int) ($snapshot['simulationBudgetUsed'] ?? 0);

        $streamingBudget = (int) $this->state->get(
            'nanite.streamingBudget',
            NaniteBudgetDirector::STREAMING_BUDGET
        );
        $simBudget = (int) $this->state->get(
            'nanite.simulationBudget',
            NaniteBudgetDirector::SIMULATION_BUDGET
        );

        $streamingOcc = $streamingBudget > 0 ? $streamingUsed / $streamingBudget : 1.0;
        $simOcc = $simBudget > 0 ? $simUsed / $simBudget : 1.0;

        if ($streamingOcc >= self::OCCUPANCY_HARD || $simOcc >= self::OCCUPANCY_HARD) {
            // Перегрузка слотов — режем оба бюджета на 15%.
            $streamingBudget = (int) ($streamingBudget * 0.85);
            $simBudget = (int) ($simBudget * 0.85);

            $this->logger->warning('Nanite budget occupancy ceiling hit, tightening.', [
                'streamingOcc' => $streamingOcc,
                'simOcc' => $simOcc,
                'streamingBudget' => $streamingBudget,
                'simulationBudget' => $simBudget,
            ]);
        } elseif ($streamingOcc < self::OCCUPANCY_SOFT && $streamingUsed < $streamingBudget) {
            // Запас слотов есть — аккуратно расширяем (но не выше дефолта).
            $streamingBudget = \min(
                NaniteBudgetDirector::STREAMING_BUDGET,
                (int) ($streamingBudget * 1.05) + 1
            );
            $simBudget = \min(
                NaniteBudgetDirector::SIMULATION_BUDGET,
                (int) ($simBudget * 1.05) + 1
            );
        }

        $this->state->set('nanite.streamingBudget', \max(8, $streamingBudget));
        $this->state->set('nanite.simulationBudget', \max(4, $simBudget));
    }
}
