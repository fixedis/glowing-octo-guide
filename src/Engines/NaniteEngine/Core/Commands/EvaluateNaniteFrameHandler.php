<?php

declare(strict_types=1);

// src/Engines/NaniteEngine/Core/Commands/EvaluateNaniteFrameHandler.php
//
// КОМАНДА ОЦЕНКИ НАНИТ-КАДРА.
//
// Получает список тел (id, screenPx, baseRadius) в payload, прогоняет через
// NaniteBudgetDirector и возвращает событие NaniteFrameEvaluated. Также
// детектирует смену активного тира относительно предыдущего кадра и эмитит
// NaniteTierChanged (аналог tier.changed в TS-RepresentSystem).

namespace Project\Engines\NaniteEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;
use Project\Engines\NaniteEngine\Core\NaniteBudgetDirector;
use Project\Engines\NaniteEngine\Core\NaniteEntityAdapter;
use Project\Engines\NaniteEngine\Core\NaniteTierSnapshot;

final class EvaluateNaniteFrameHandler implements CommandHandlerInterface
{
    public function __construct(
        private readonly NaniteBudgetDirector $director
    ) {
    }

    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $raw = $command->payload['entities'] ?? null;

        if (!is_array($raw)) {
            return CommandResult::fail(
                'Command "EvaluateNaniteFrame" requires "entities" payload array.'
            );
        }

        $entities = $this->normalizeEntities($raw);

        if ($entities === []) {
            return CommandResult::fail(
                'Command "EvaluateNaniteFrame" received no valid entities.'
            );
        }

        // Адаптируем сырые данные к домен-независимому контракту.
        $adapted = [];
        foreach ($entities as $entry) {
            $adapted[] = new NaniteEntityAdapter(
                $entry['id'],
                $entry['screenPx'],
                $entry['baseRadius']
            );
        }

        $focusId = is_string($command->payload['focusId'] ?? null)
            ? $command->payload['focusId']
            : null;

        $results = $this->director->evaluate($adapted, $focusId);

        $signature = $this->computeSignature($results);
        $prevSignature = $state->get('nanite.signature');
        $prevTiers = $state->get('nanite.tiers', []);

        $tierChangedEvents = [];

        foreach ($results as $id => $result) {
            $from = is_array($prevTiers) ? ($prevTiers[$id] ?? null) : null;

            if ($from !== $result->activeTier) {
                $tierChangedEvents[] = new Event(
                    sprintf('nanite_tier_%s_%s', $id, $command->id),
                    'NaniteTierChanged',
                    [
                        'entityId' => $id,
                        'from' => $from,
                        'to' => $result->activeTier,
                        'screenPx' => $result->screenPx,
                    ],
                    (int) $state->get('tick', 0)
                );
            }
        }

        $snapshot = new NaniteTierSnapshot(
            $results,
            $this->countStreamed($results),
            $this->countSimulated($results),
            $signature
        );

        $state->set('nanite.signature', $signature);
        $state->set('nanite.tiers', $this->currentTiers($results));
        $state->set('nanite.snapshot', $snapshot->toArray());

        $events = [
            new Event(
                sprintf('nanite_frame_%s', $command->id),
                'NaniteFrameEvaluated',
                $snapshot->toArray(),
                (int) $state->get('tick', 0)
            ),
            ...$tierChangedEvents,
        ];

        // Сигнатура не изменилась — это нормально, просто кадр стабилен.
        if ($prevSignature === $signature) {
            $state->set('nanite.stableFrames', (int) $state->get('nanite.stableFrames', 0) + 1);
        } else {
            $state->set('nanite.stableFrames', 0);
        }

        return CommandResult::ok($events);
    }

    /**
     * @param array<int, mixed> $raw
     * @return list<array{id: string, screenPx: int, baseRadius: int}>
     */
    private function normalizeEntities(array $raw): array
    {
        $entities = [];

        foreach ($raw as $entry) {
            if (!is_array($entry)) {
                continue;
            }

            $id = $entry['id'] ?? null;
            $screenPx = $entry['screenPx'] ?? null;
            $baseRadius = $entry['baseRadius'] ?? null;

            if (!is_string($id) || !is_int($screenPx) || !is_int($baseRadius)) {
                continue;
            }

            $entities[] = [
                'id' => $id,
                'screenPx' => \max(0, $screenPx),
                'baseRadius' => \max(1, $baseRadius),
            ];
        }

        return $entities;
    }

    /**
     * @param array<string, \Project\Engines\NaniteEngine\Core\NaniteEntityResult> $results
     */
    private function computeSignature(array $results): string
    {
        $parts = [];

        foreach ($results as $id => $r) {
            $parts[] = sprintf('%s:%d:%s:%d', $id, $r->screenPx, $r->activeTier, $r->simulated ? 1 : 0);
        }

        return md5(implode('|', $parts));
    }

    /**
     * @param array<string, \Project\Engines\NaniteEngine\Core\NaniteEntityResult> $results
     * @return array<string, string>
     */
    private function currentTiers(array $results): array
    {
        $tiers = [];

        foreach ($results as $id => $r) {
            $tiers[$id] = $r->activeTier;
        }

        return $tiers;
    }

    /**
     * @param array<string, \Project\Engines\NaniteEngine\Core\NaniteEntityResult> $results
     */
    private function countStreamed(array $results): int
    {
        $n = 0;

        foreach ($results as $r) {
            if ($r->streamed) {
                $n++;
            }
        }

        return $n;
    }

    /**
     * @param array<string, \Project\Engines\NaniteEngine\Core\NaniteEntityResult> $results
     */
    private function countSimulated(array $results): int
    {
        $n = 0;

        foreach ($results as $r) {
            if ($r->simulated) {
                $n++;
            }
        }

        return $n;
    }
}
