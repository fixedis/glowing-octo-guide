<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Core/Commands/DemolishBuildingHandler.php

namespace Project\Engines\UniverseEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;
use Project\Engines\UniverseEngine\Contracts\BuildingDeltaStoreInterface;
use Project\Engines\UniverseEngine\Core\Colony\ColonyGrid;

final class DemolishBuildingHandler implements CommandHandlerInterface
{
    public function __construct(
        private readonly BuildingDeltaStoreInterface $store
    ) {
    }

    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $planetSeed = $this->intPayload($command, 'planetSeed');
        $face = $this->intPayload($command, 'face');
        $x = $this->intPayload($command, 'x');
        $y = $this->intPayload($command, 'y');
        $depth = $this->intPayload($command, 'depth');

        if ($planetSeed === null || $face === null || $x === null || $y === null || $depth === null) {
            return CommandResult::fail(sprintf(
                'Command "%s" requires integer payload fields: planetSeed, face, x, y, depth.',
                $command->type
            ));
        }

        if (!ColonyGrid::isValidCell($face, $x, $y, $depth)) {
            return CommandResult::fail('Invalid colony cell coordinates.');
        }

        $this->store->demolish($planetSeed, $face, $x, $y);

        return CommandResult::ok([
            new Event(
                sprintf('building_demolished_%s', $command->id),
                'BuildingDemolished',
                [
                    'planetSeed' => $planetSeed,
                    'face' => $face,
                    'x' => $x,
                    'y' => $y,
                    'depth' => $depth,
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
