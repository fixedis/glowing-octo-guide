<?php

declare(strict_types=1);

// src/Engines/FleetEngine/Core/Commands/MoveFleetHandler.php

namespace Project\Engines\FleetEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;
use Project\Engines\FleetEngine\Entities\FleetBlueprint;

/**
 * Перемещение флота в целевые координаты.
 *
 * Читает/пишет `fleet.{fleetSeed}` (собственное состояние FleetEngine).
 * Координаты — целочисленные (fixed-point), как у UniverseEngine; выход за
 * границы клампится в MAX_COORD (без god-флага — поведение перемещения
 * консервативно, чтобы не ломать детерминизм симуляции).
 *
 * Детерминизм: координаты задаются явно командой, кламп — детерминирован.
 */
final class MoveFleetHandler implements CommandHandlerInterface
{
    private const FLEET_PREFIX = 'fleet.';

    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $fleetSeed = $command->payload['fleetSeed'] ?? null;
        $x = $command->payload['x'] ?? null;
        $y = $command->payload['y'] ?? null;
        $z = $command->payload['z'] ?? null;

        if (!is_int($fleetSeed) || $fleetSeed <= 0) {
            return CommandResult::fail('MoveFleet requires positive integer "fleetSeed".');
        }

        if (!is_int($x) || !is_int($y) || !is_int($z)) {
            return CommandResult::fail('MoveFleet requires integer coordinates "x", "y", "z".');
        }

        $fleetKey = self::FLEET_PREFIX . $fleetSeed;
        if (!$state->has($fleetKey)) {
            return CommandResult::fail(sprintf('Fleet %d does not exist.', $fleetSeed));
        }

        /** @var array<string, mixed> $fleet */
        $fleet = $state->get($fleetKey);

        $fleet['x'] = FleetBlueprint::clampCoord($x);
        $fleet['y'] = FleetBlueprint::clampCoord($y);
        $fleet['z'] = FleetBlueprint::clampCoord($z);
        $fleet['lastMoveTick'] = (int) ($state->get('tick', 0));

        $state->set($fleetKey, $fleet);

        return CommandResult::ok([
            new Event(
                sprintf('fleet_moved_%s', $command->id),
                'FleetMoved',
                [
                    'fleetSeed' => $fleetSeed,
                    'x' => $fleet['x'],
                    'y' => $fleet['y'],
                    'z' => $fleet['z'],
                    'clamped' => $fleet['x'] !== $x || $fleet['y'] !== $y || $fleet['z'] !== $z,
                ],
                (int) ($state->get('tick', 0))
            ),
        ]);
    }
}
