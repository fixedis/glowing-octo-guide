<?php

declare(strict_types=1);

// src/Engines/AdminEngine/Core/Commands/AdminSetNaniteBudgetHandler.php

namespace Project\Engines\AdminEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;

/**
 * Переопределение бюджетов NaniteEngine администратором.
 *
 * Пишет nanite.streamingBudget / nanite.simulationBudget в State. NaniteBudgetRegulator
 * читает эти ключи как override (см. NaniteEngine). Значения — целые (count).
 */
final class AdminSetNaniteBudgetHandler implements CommandHandlerInterface
{
    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $streaming = $command->payload['streaming'] ?? null;
        $simulation = $command->payload['simulation'] ?? null;

        if ($streaming !== null && (!is_int($streaming) || $streaming < 1)) {
            return CommandResult::fail('"streaming" must be a positive integer.');
        }

        if ($simulation !== null && (!is_int($simulation) || $simulation < 1)) {
            return CommandResult::fail('"simulation" must be a positive integer.');
        }

        if ($streaming !== null) {
            $state->set('nanite.streamingBudget', $streaming);
        }

        if ($simulation !== null) {
            $state->set('nanite.simulationBudget', $simulation);
        }

        if ($streaming === null && $simulation === null) {
            return CommandResult::fail('AdminSetNaniteBudget requires at least one of: streaming, simulation.');
        }

        return CommandResult::ok([
            new Event(
                sprintf('nanite_budget_overridden_%s', $command->id),
                'NaniteBudgetOverridden',
                [
                    'streaming' => $state->get('nanite.streamingBudget'),
                    'simulation' => $state->get('nanite.simulationBudget'),
                ],
                (int) ($state->get('tick', 0))
            ),
        ]);
    }
}
