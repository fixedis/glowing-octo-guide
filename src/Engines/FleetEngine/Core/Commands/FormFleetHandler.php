<?php

declare(strict_types=1);

// src/Engines/FleetEngine/Core/Commands/FormFleetHandler.php

namespace Project\Engines\FleetEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;
use Project\Engines\FleetEngine\Entities\FleetBlueprint;

/**
 * Формирование флота из произведённых юнитов колонии.
 *
 * Замыкает цепочку Economy -> Production -> Fleet: берёт юниты из
 * `production.colony.{seed}.units[]` (созданные ProduceUnit) и группирует их
 * в летающий флот `fleet.{fleetSeed}`. Юниты изымаются из пула колонии,
 * чтобы нельзя было собрать один юнит в два флота (детерминизм).
 *
 * Контракт с соседями — только через State (rules.md «Архитектура» п.3):
 * FleetEngine читает/пишет `production.colony.*` (свой продукт ProductionEngine)
 * и пишет `fleet.*`. Не лезет в economy.colony.* напрямую.
 *
 * Детерминизм: выбор юнитов по явным индексам из команды, без RNG.
 */
final class FormFleetHandler implements CommandHandlerInterface
{
    private const PRODUCTION_PREFIX = 'production.colony.';
    private const FLEET_PREFIX = 'fleet.';

    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $fleetSeed = $command->payload['fleetSeed'] ?? null;
        $ownerColonySeed = $command->payload['ownerColonySeed'] ?? null;
        $type = $command->payload['type'] ?? null;
        $unitIndices = $command->payload['unitIndices'] ?? null;

        if (!is_int($fleetSeed) || $fleetSeed <= 0) {
            return CommandResult::fail('FormFleet requires positive integer "fleetSeed".');
        }

        if (!is_int($ownerColonySeed) || $ownerColonySeed <= 0) {
            return CommandResult::fail('FormFleet requires positive integer "ownerColonySeed".');
        }

        if (!is_string($type) || !FleetBlueprint::isFleetType($type)) {
            return CommandResult::fail(sprintf(
                'FormFleet requires fleet type (one of: %s).',
                implode(', ', FleetBlueprint::FLEET_TYPES)
            ));
        }

        if (!is_array($unitIndices) || $unitIndices === []) {
            return CommandResult::fail('FormFleet requires non-empty array "unitIndices" (int[]).');
        }

        $fleetKey = self::FLEET_PREFIX . $fleetSeed;
        if ($state->has($fleetKey)) {
            return CommandResult::fail(sprintf('Fleet %d already exists.', $fleetSeed));
        }

        $productionKey = self::PRODUCTION_PREFIX . $ownerColonySeed;
        if (!$state->has($productionKey)) {
            return CommandResult::fail(sprintf('Colony %d has no produced units.', $ownerColonySeed));
        }

        /** @var array<string, mixed> $production */
        $production = $state->get($productionKey);
        $availableUnits = $production['units'] ?? [];

        $selected = [];
        $usedFlags = [];

        foreach ($unitIndices as $index) {
            if (!is_int($index)) {
                return CommandResult::fail('FormFleet "unitIndices" must contain only integers.');
            }

            if (isset($usedFlags[$index])) {
                return CommandResult::fail(sprintf('Duplicate unit index %d in FormFleet.', $index));
            }

            if (!array_key_exists($index, $availableUnits)) {
                return CommandResult::fail(sprintf('Unit index %d does not exist in colony %d.', $index, $ownerColonySeed));
            }

            $usedFlags[$index] = true;
            $selected[] = $availableUnits[$index];
        }

        // Изъятие выбранных юнитов из пула колонии (детерминизм: индекс не переиспользуется).
        $remaining = [];
        foreach ($availableUnits as $idx => $unit) {
            if (!isset($usedFlags[$idx])) {
                $remaining[] = $unit;
            }
        }
        $production['units'] = $remaining;
        $state->set($productionKey, $production);

        $fleet = [
            'fleetSeed' => $fleetSeed,
            'ownerColonySeed' => $ownerColonySeed,
            'type' => $type,
            'units' => $selected,
            'x' => 0,
            'y' => 0,
            'z' => 0,
            'formedTick' => (int) ($state->get('tick', 0)),
        ];
        $state->set($fleetKey, $fleet);

        return CommandResult::ok([
            new Event(
                sprintf('fleet_formed_%s', $command->id),
                'FleetFormed',
                [
                    'fleetSeed' => $fleetSeed,
                    'ownerColonySeed' => $ownerColonySeed,
                    'type' => $type,
                    'unitCount' => count($selected),
                ],
                (int) ($state->get('tick', 0))
            ),
        ]);
    }
}
