<?php

declare(strict_types=1);

// src/Engines/AdminEngine/Core/Commands/AdminGrantResourcesHandler.php

namespace Project\Engines\AdminEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;

/**
 * Выдача ресурсов колонии в обход добычи (admin-команда).
 *
 * Добавляет amount к economy.colony.{planetSeed}.stored. Требует регистрации
 * колонии в EconomyEngine.
 */
final class AdminGrantResourcesHandler implements CommandHandlerInterface
{
    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $planetSeed = $command->payload['planetSeed'] ?? null;
        $amount = $command->payload['amount'] ?? null;

        if (!is_int($planetSeed) || $planetSeed <= 0) {
            return CommandResult::fail('AdminGrantResources requires positive integer "planetSeed".');
        }

        if (!is_int($amount) || $amount <= 0) {
            return CommandResult::fail('AdminGrantResources requires positive integer "amount".');
        }

        $key = 'economy.colony.' . $planetSeed;

        if (!$state->has($key)) {
            return CommandResult::fail(sprintf('Colony %d is not registered in economy.', $planetSeed));
        }

        /** @var array<string, int> $colony */
        $colony = $state->get($key);
        $colony['stored'] += $amount;
        $state->set($key, $colony);

        return CommandResult::ok([
            new Event(
                sprintf('resources_granted_%s', $command->id),
                'ResourcesGranted',
                ['planetSeed' => $planetSeed, 'amount' => $amount, 'stored' => $colony['stored']],
                (int) ($state->get('tick', 0))
            ),
        ]);
    }
}
