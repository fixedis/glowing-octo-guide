<?php

declare(strict_types=1);

// src/Engines/AdminEngine/Core/Commands/AdminEditEconomyHandler.php

namespace Project\Engines\AdminEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;

/**
 * Редактирование экономики колонии администратором.
 *
 * Правит поля baseYield / efficiency в economy.colony.{planetSeed}.
 * Требует, чтобы колония была зарегистрирована в EconomyEngine.
 */
final class AdminEditEconomyHandler implements CommandHandlerInterface
{
    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $planetSeed = $command->payload['planetSeed'] ?? null;
        $baseYield = $command->payload['baseYield'] ?? null;
        $efficiency = $command->payload['efficiency'] ?? null;

        if (!is_int($planetSeed) || $planetSeed <= 0) {
            return CommandResult::fail('AdminEditEconomy requires positive integer "planetSeed".');
        }

        if ($baseYield !== null && (!is_int($baseYield) || $baseYield < 0)) {
            return CommandResult::fail('"baseYield" must be a non-negative integer.');
        }

        if ($efficiency !== null && (!is_int($efficiency) || $efficiency <= 0)) {
            return CommandResult::fail('"efficiency" must be a positive integer (fixed-point).');
        }

        $key = 'economy.colony.' . $planetSeed;

        if (!$state->has($key)) {
            return CommandResult::fail(sprintf('Colony %d is not registered in economy.', $planetSeed));
        }

        /** @var array<string, int> $colony */
        $colony = $state->get($key);

        if ($baseYield !== null) {
            $colony['baseYield'] = $baseYield;
        }

        if ($efficiency !== null) {
            $colony['efficiency'] = $efficiency;
        }

        $state->set($key, $colony);

        return CommandResult::ok([
            new Event(
                sprintf('economy_edited_%s', $command->id),
                'EconomyEdited',
                ['planetSeed' => $planetSeed, 'baseYield' => $colony['baseYield'], 'efficiency' => $colony['efficiency']],
                (int) ($state->get('tick', 0))
            ),
        ]);
    }
}
