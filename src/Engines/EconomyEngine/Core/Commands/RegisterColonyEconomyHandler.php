<?php

declare(strict_types=1);

// src/Engines/EconomyEngine/Core/Commands/RegisterColonyEconomyHandler.php

namespace Project\Engines\EconomyEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;

/**
 * Регистрирует колонию в экономике.
 *
 * Вход: planetSeed (int), baseYield (int, fixed-point).
 * Источник команды — внешний модуль или клиент (EconomyEngine не знает про UniverseEngine).
 */
final class RegisterColonyEconomyHandler implements CommandHandlerInterface
{
    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $planetSeed = $command->payload['planetSeed'] ?? null;
        $baseYield = $command->payload['baseYield'] ?? null;

        if (!is_int($planetSeed) || $planetSeed <= 0) {
            return CommandResult::fail('RegisterColonyEconomy requires positive integer "planetSeed".');
        }

        if (!is_int($baseYield) || $baseYield < 0) {
            return CommandResult::fail('RegisterColonyEconomy requires non-negative integer "baseYield".');
        }

        $key = 'economy.colony.' . $planetSeed;

        // Уже зарегистрирована — идемпотентность.
        if ($state->has($key)) {
            return CommandResult::ok([
                new Event(
                    sprintf('colony_econ_registered_%d', $planetSeed),
                    'ColonyEconomyRegistered',
                    ['planetSeed' => $planetSeed, 'already' => true],
                    (int) ($state->get('tick', 0))
                ),
            ]);
        }

        $state->set($key, [
            'planetSeed' => $planetSeed,
            'baseYield' => $baseYield,
            'stored' => 0,
            'efficiency' => 1_000_000, // 1.0 в fixed-point
        ]);

        return CommandResult::ok([
            new Event(
                sprintf('colony_econ_registered_%d', $planetSeed),
                'ColonyEconomyRegistered',
                ['planetSeed' => $planetSeed, 'baseYield' => $baseYield],
                (int) ($state->get('tick', 0))
            ),
        ]);
    }
}
