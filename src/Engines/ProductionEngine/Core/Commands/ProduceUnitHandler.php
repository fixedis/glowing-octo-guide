<?php

declare(strict_types=1);

// src/Engines/ProductionEngine/Core/Commands/ProduceUnitHandler.php

namespace Project\Engines\ProductionEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;
use Project\Engines\ProductionEngine\Entities\ProductionBlueprint;

/**
 * Производство юнита колонии.
 *
 * Списывает ресурсы из `economy.colony.{seed}.stored` и добавляет юнит
 * в `production.colony.{seed}.units[]`. Стоимость: из команды (`cost`) либо
 * базовая из `ProductionBlueprint` по типу.
 *
 * Детерминирован: списание через MathKernel, типы фиксированы.
 */
final class ProduceUnitHandler implements CommandHandlerInterface
{
    private const ECONOMY_PREFIX = 'economy.colony.';
    private const PRODUCTION_PREFIX = 'production.colony.';

    public function __construct(
        private readonly \Project\CoreEngine\Contracts\MathKernelInterface $math
    ) {
    }

    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $planetSeed = $command->payload['planetSeed'] ?? null;
        $type = $command->payload['type'] ?? null;
        $cost = $command->payload['cost'] ?? null;

        if (!is_int($planetSeed) || $planetSeed <= 0) {
            return CommandResult::fail('ProduceUnit requires positive integer "planetSeed".');
        }

        if (!is_string($type) || !ProductionBlueprint::isUnit($type)) {
            return CommandResult::fail(sprintf(
                'ProduceUnit requires unit type (one of: %s).',
                implode(', ', ProductionBlueprint::UNIT_TYPES)
            ));
        }

        $economyKey = self::ECONOMY_PREFIX . $planetSeed;

        if (!$state->has($economyKey)) {
            return CommandResult::fail(sprintf('Colony %d is not registered in economy.', $planetSeed));
        }

        /** @var array<string, int> $colony */
        $colony = $state->get($economyKey);

        $realCost = is_int($cost) && $cost > 0
            ? $cost
            : ProductionBlueprint::baseCost($type);

        if ($colony['stored'] < $realCost) {
            return CommandResult::fail(sprintf(
                'Not enough resources: need %d, have %d.',
                $realCost,
                $colony['stored']
            ));
        }

        $colony['stored'] = $this->math->subtract($colony['stored'], $realCost);
        $state->set($economyKey, $colony);

        $productionKey = self::PRODUCTION_PREFIX . $planetSeed;
        /** @var array<string, mixed> $production */
        $production = $state->has($productionKey)
            ? $state->get($productionKey)
            : ['planetSeed' => $planetSeed, 'buildings' => [], 'units' => []];

        $production['units'][] = [
            'type' => $type,
            'cost' => $realCost,
            'producedTick' => (int) ($state->get('tick', 0)),
        ];

        $state->set($productionKey, $production);

        return CommandResult::ok([
            new Event(
                sprintf('unit_produced_%s', $command->id),
                'UnitProduced',
                [
                    'planetSeed' => $planetSeed,
                    'type' => $type,
                    'cost' => $realCost,
                    'storedLeft' => $colony['stored'],
                ],
                (int) ($state->get('tick', 0))
            ),
        ]);
    }
}
