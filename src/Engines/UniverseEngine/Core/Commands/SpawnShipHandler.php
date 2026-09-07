<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Core/Commands/SpawnShipHandler.php

namespace Project\Engines\UniverseEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;
use Project\Engines\UniverseEngine\Entities\Ships\Ship;

/**
 * Спавн корабля с явными координатами и классом.
 *
 * В обычном режиме координаты валидируются по границам. В режиме бога
 * (state['admin.godmode']) валидация пропускается.
 */
final class SpawnShipHandler implements CommandHandlerInterface
{
    private const GODMODE_KEY = 'admin.godmode';
    private const MAX_COORD = 5_000_000;

    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $seed = $this->int($command, 'seed');
        $shipClass = $this->str($command, 'shipClass');
        $x = $this->int($command, 'x') ?? 0;
        $y = $this->int($command, 'y') ?? 0;
        $z = $this->int($command, 'z') ?? 0;
        $ownerColonySeed = $this->int($command, 'ownerColonySeed') ?? 0;

        if ($seed === null || $shipClass === null) {
            return CommandResult::fail(
                'SpawnShip requires: seed (int), shipClass (string) and optional x, y, z, ownerColonySeed (int).'
            );
        }

        if (!in_array($shipClass, Ship::CLASSES, true)) {
            return CommandResult::fail(sprintf('Unknown ship class "%s".', $shipClass));
        }

        $godmode = (bool) ($state->get(self::GODMODE_KEY, false));

        if (!$godmode && $this->outOfBounds($x, $y, $z)) {
            return CommandResult::fail(sprintf(
                'Coordinates (x=%d, y=%d, z=%d) out of bounds. Enable god mode to spawn anywhere.',
                $x, $y, $z
            ));
        }

        $ship = new Ship($seed, $shipClass, $x, $y, $z, $ownerColonySeed);

        $state->set('universe.spawned.ship.' . $seed, $ship->toArray());

        return CommandResult::ok([
            new Event(
                sprintf('ship_spawned_%s', $command->id),
                'ShipSpawned',
                [
                    'seed' => $seed,
                    'shipClass' => $shipClass,
                    'x' => $x,
                    'y' => $y,
                    'z' => $z,
                    'godmode' => $godmode,
                    'ship' => $ship->toArray(),
                ],
                (int) ($state->get('tick', 0))
            ),
        ]);
    }

    private function outOfBounds(int $x, int $y, int $z): bool
    {
        return abs($x) > self::MAX_COORD
            || abs($y) > self::MAX_COORD
            || abs($z) > self::MAX_COORD;
    }

    private function int(Command $command, string $key): ?int
    {
        $value = $command->payload[$key] ?? null;

        return is_int($value) ? $value : null;
    }

    private function str(Command $command, string $key): ?string
    {
        $value = $command->payload[$key] ?? null;

        return is_string($value) ? $value : null;
    }
}
