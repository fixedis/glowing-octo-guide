<?php

declare(strict_types=1);

// src/Engines/NaniteEngine/Core/NaniteTierSnapshot.php
//
// СНЭПШОТ СОСТОЯНИЯ ТИРА (состояние логического бюджета на кадр).
//
// Хранит последние результаты по телам + занятые слоты бюджета, чтобы:
//   - детектировать смену тира (для события NaniteTierChanged);
//   - переиспользовать расчёт между кадрами (сигнатура не изменилась -> skip);
//   - отдавать в Kernel snapshot (persist).
//
// НЕ содержит ничего про геометрию/треугольники — это зона клиента.

namespace Project\Engines\NaniteEngine\Core;

final class NaniteTierSnapshot
{
    /**
     * @param array<string, NaniteEntityResult> $results
     */
    public function __construct(
        public readonly array $results,
        public readonly int $streamingBudgetUsed,
        public readonly int $simulationBudgetUsed,
        public readonly string $signature
    ) {
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'results' => array_map(
                static fn (NaniteEntityResult $r): array => $r->toArray(),
                $this->results
            ),
            'streamingBudgetUsed' => $this->streamingBudgetUsed,
            'simulationBudgetUsed' => $this->simulationBudgetUsed,
            'signature' => $this->signature,
        ];
    }
}
