<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Core/Commands/SpawnPlanetHandler.php

namespace Project\Engines\UniverseEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;
use Project\Engines\UniverseEngine\Entities\Planets\Planet;

/**
 * Спавн планеты с явными параметрами.
 *
 * В обычном режиме координаты (x,y,z) валидируются как «в пределах генерируемой
 * области». В режиме бога (state['admin.godmode'] = true) валидация координат
 * пропускается — планету можно поместить где угодно.
 *
 * Результат кладётся в State как universe.spawned.planet.{seed} и эмитит
 * событие PlanetSpawned (для клиента/других движков).
 */
final class SpawnPlanetHandler implements CommandHandlerInterface
{
    private const GODMODE_KEY = 'admin.godmode';
    private const MAX_COORD = 5_000_000;

    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $seed = $this->int($command, 'seed');
        $index = $this->int($command, 'index') ?? 0;
        $type = $this->str($command, 'type');
        $radiusKm = $this->int($command, 'radiusKm');
        $semiMajorAxisAuMilli = $this->int($command, 'semiMajorAxisAuMilli');
        $eccentricityFixed = $this->int($command, 'eccentricityFixed');
        $inclinationFixed = $this->int($command, 'inclinationFixed');
        $variant = $this->str($command, 'variant') ?? 'earth_like';
        $x = $this->int($command, 'x') ?? 0;
        $y = $this->int($command, 'y') ?? 0;
        $z = $this->int($command, 'z') ?? 0;

        if ($seed === null || $type === null || $radiusKm === null
            || $semiMajorAxisAuMilli === null || $eccentricityFixed === null
            || $inclinationFixed === null) {
            return CommandResult::fail(
                'SpawnPlanet requires: seed, type, radiusKm, semiMajorAxisAuMilli, '
                . 'eccentricityFixed, inclinationFixed (int) and optional index, variant, x, y, z.'
            );
        }

        if (!in_array($type, [
            Planet::TYPE_TERRAN, Planet::TYPE_ICE, Planet::TYPE_LAVA,
            Planet::TYPE_GAS, Planet::TYPE_MOON,
        ], true)) {
            return CommandResult::fail(sprintf('Unknown planet type "%s".', $type));
        }

        $godmode = (bool) ($state->get(self::GODMODE_KEY, false));

        if (!$godmode && $this->outOfBounds($x, $y, $z)) {
            return CommandResult::fail(sprintf(
                'Coordinates (x=%d, y=%d, z=%d) out of bounds. Enable god mode to spawn anywhere.',
                $x, $y, $z
            ));
        }

        $planet = new Planet(
            $seed,
            $index,
            $type,
            $radiusKm,
            $semiMajorAxisAuMilli,
            $eccentricityFixed,
            $inclinationFixed,
            $variant
        );

        $state->set('universe.spawned.planet.' . $seed, $planet->toArray());

        return CommandResult::ok([
            new Event(
                sprintf('planet_spawned_%s', $command->id),
                'PlanetSpawned',
                [
                    'seed' => $seed,
                    'type' => $type,
                    'x' => $x,
                    'y' => $y,
                    'z' => $z,
                    'godmode' => $godmode,
                    'planet' => $planet->toArray(),
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
