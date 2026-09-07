<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Core/Commands/GenerateColonyAreaHandler.php

namespace Project\Engines\UniverseEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;
use Project\Engines\UniverseEngine\Core\Colony\ColonyGrid;
use Project\Engines\UniverseEngine\Core\Colony\ColonyResolver;

final class GenerateColonyAreaHandler implements CommandHandlerInterface
{
    public function __construct(
        private readonly ColonyResolver $resolver
    ) {
    }

    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $planetSeed = $this->intPayload($command, 'planetSeed');
        $face = $this->intPayload($command, 'face');
        $depth = $this->intPayload($command, 'depth');
        $x = $this->intPayload($command, 'x');
        $y = $this->intPayload($command, 'y');
        $size = $this->intPayload($command, 'size');

        if ($planetSeed === null || $face === null || $depth === null
            || $x === null || $y === null || $size === null) {
            return CommandResult::fail(sprintf(
                'Command "%s" requires integer payload fields: planetSeed, face, depth, x, y, size.',
                $command->type
            ));
        }

        if ($size < 1 || $size > 32) {
            return CommandResult::fail('Area size must be between 1 and 32.');
        }

        if (!ColonyGrid::isValidCell($face, $x, $y, $depth)) {
            return CommandResult::fail('Invalid colony cell coordinates.');
        }

        if ($x + $size > ColonyGrid::side($depth) || $y + $size > ColonyGrid::side($depth)) {
            return CommandResult::fail('Colony area is out of grid bounds.');
        }

        $buildings = [];

        for ($cx = $x; $cx < $x + $size; $cx++) {
            for ($cy = $y; $cy < $y + $size; $cy++) {
                $building = $this->resolver->buildingFor($planetSeed, $face, $cx, $cy, $depth);

                if ($building !== null) {
                    $buildings[] = $building->toArray();
                }
            }
        }

        return CommandResult::ok([
            new Event(
                sprintf('colony_area_%s', $command->id),
                'ColonyAreaGenerated',
                [
                    'planetSeed' => $planetSeed,
                    'face' => $face,
                    'depth' => $depth,
                    'x' => $x,
                    'y' => $y,
                    'size' => $size,
                    'buildings' => $buildings,
                ],
                (int) $state->get('tick', 0)
            ),
        ]);
    }

    private function intPayload(Command $command, string $key): ?int
    {
        $value = $command->payload[$key] ?? null;

        return is_int($value) ? $value : null;
    }
}
