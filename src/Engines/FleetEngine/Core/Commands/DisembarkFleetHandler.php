<?php

declare(strict_types=1);

// src/Engines/FleetEngine/Core/Commands/DisembarkFleetHandler.php

namespace Project\Engines\FleetEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;
use Project\Engines\FleetEngine\Entities\FleetBlueprint;

/**
 * Высадка десанта флота на планету.
 *
 * Контракт с UniverseEngine — только через общий State: FleetEngine читает
 * `universe.spawned.planet.{planetSeed}` (координаты планеты) и `fleet.{fleetSeed}`
 * (текущие координаты флота). Если флот в пределах DISEMBARK_RADIUS от планеты —
 * фиксирует десант в `fleet.{fleetSeed}.disembarked` (без изменения состояния
 * планеты напрямую: это зона UniverseEngine/клиента).
 *
 * Детерминизм: расстояние — чебышёвское, целочисленное (FleetBlueprint).
 */
final class DisembarkFleetHandler implements CommandHandlerInterface
{
    private const FLEET_PREFIX = 'fleet.';
    private const PLANET_PREFIX = 'universe.spawned.planet.';

    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $fleetSeed = $command->payload['fleetSeed'] ?? null;
        $planetSeed = $command->payload['planetSeed'] ?? null;

        if (!is_int($fleetSeed) || $fleetSeed <= 0) {
            return CommandResult::fail('DisembarkFleet requires positive integer "fleetSeed".');
        }

        if (!is_int($planetSeed) || $planetSeed <= 0) {
            return CommandResult::fail('DisembarkFleet requires positive integer "planetSeed".');
        }

        $fleetKey = self::FLEET_PREFIX . $fleetSeed;
        if (!$state->has($fleetKey)) {
            return CommandResult::fail(sprintf('Fleet %d does not exist.', $fleetSeed));
        }

        $planetKey = self::PLANET_PREFIX . $planetSeed;
        if (!$state->has($planetKey)) {
            return CommandResult::fail(sprintf('Planet %d is not spawned (UniverseEngine).', $planetSeed));
        }

        /** @var array<string, mixed> $fleet */
        $fleet = $state->get($fleetKey);
        /** @var array<string, int> $planet */
        $planet = $state->get($planetKey);

        $fleetPos = [
            'x' => (int) ($fleet['x'] ?? 0),
            'y' => (int) ($fleet['y'] ?? 0),
            'z' => (int) ($fleet['z'] ?? 0),
        ];
        $planetPos = [
            'x' => (int) ($planet['x'] ?? 0),
            'y' => (int) ($planet['y'] ?? 0),
            'z' => (int) ($planet['z'] ?? 0),
        ];

        $distance = FleetBlueprint::chebyshevDistance($fleetPos, $planetPos);
        if ($distance > FleetBlueprint::DISEMBARK_RADIUS) {
            return CommandResult::fail(sprintf(
                'Fleet %d too far from planet %d: distance %d > radius %d. Move closer first.',
                $fleetSeed,
                $planetSeed,
                $distance,
                FleetBlueprint::DISEMBARK_RADIUS
            ));
        }

        $fleet['disembarked'] = [
            'planetSeed' => $planetSeed,
            'tick' => (int) ($state->get('tick', 0)),
            'unitCount' => count($fleet['units'] ?? []),
        ];
        $state->set($fleetKey, $fleet);

        return CommandResult::ok([
            new Event(
                sprintf('fleet_disembarked_%s', $command->id),
                'FleetDisembarked',
                [
                    'fleetSeed' => $fleetSeed,
                    'planetSeed' => $planetSeed,
                    'distance' => $distance,
                    'unitCount' => count($fleet['units'] ?? []),
                ],
                (int) ($state->get('tick', 0))
            ),
        ]);
    }
}
