<?php

declare(strict_types=1);

// src/Engines/EconomyEngine/Core/Commands/CollectResourcesHandler.php

namespace Project\Engines\EconomyEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\MathKernelInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;

/**
 * Снимает накопленные ресурсы колонии в кэш-клейм.
 *
 * Вход: planetSeed (int). Доход считается в EconomyTickSystem, здесь только
 * перевод из "stored" в "collected" с фиксацией события.
 */
final class CollectResourcesHandler implements CommandHandlerInterface
{
    public function __construct(
        private readonly MathKernelInterface $math
    ) {
    }

    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $planetSeed = $command->payload['planetSeed'] ?? null;

        if (!is_int($planetSeed) || $planetSeed <= 0) {
            return CommandResult::fail('CollectResources requires positive integer "planetSeed".');
        }

        $key = 'economy.colony.' . $planetSeed;

        if (!$state->has($key)) {
            return CommandResult::fail(sprintf('Colony %d is not registered in economy.', $planetSeed));
        }

        /** @var array{planetSeed:int,baseYield:int,stored:int,efficiency:int} $colony */
        $colony = $state->get($key);
        $collected = $colony['stored'];

        if ($collected <= 0) {
            return CommandResult::fail(sprintf('Colony %d has no resources to collect.', $planetSeed));
        }

        $colony['stored'] = 0;
        $state->set($key, $colony);

        $collectedKey = 'economy.collected';

        $total = $state->has($collectedKey)
            ? $this->math->add((int) $state->get($collectedKey), $collected)
            : $collected;

        $state->set($collectedKey, $total);

        return CommandResult::ok([
            new Event(
                sprintf('resources_collected_%d', $planetSeed),
                'ResourcesCollected',
                ['planetSeed' => $planetSeed, 'amount' => $collected, 'total' => $total],
                (int) ($state->get('tick', 0))
            ),
        ]);
    }
}
