<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Core/Commands/PlaceBuildingHandler.php

namespace Project\Engines\UniverseEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;
use Project\Engines\UniverseEngine\Contracts\BuildingDeltaStoreInterface;
use Project\Engines\UniverseEngine\Core\Colony\ColonyGrid;
use Project\Engines\UniverseEngine\Core\Colony\ColonyResolver;
use Project\Engines\UniverseEngine\Entities\Buildings\Building;

final class PlaceBuildingHandler implements CommandHandlerInterface
{
    public function __construct(
        private readonly ColonyResolver $resolver,
        private readonly BuildingDeltaStoreInterface $store
    ) {
    }

    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $planetSeed = $this->intPayload($command, 'planetSeed');
        $face = $this->intPayload($command, 'face');
        $x = $this->intPayload($command, 'x');
        $y = $this->intPayload($command, 'y');
        $type = $this->stringPayload($command, 'type');
        $depth = $this->intPayload($command, 'depth') ?? 2;

        if ($planetSeed === null || $face === null || $x === null || $y === null || $type === null) {
            return CommandResult::fail(sprintf(
                'Command "%s" requires payload fields: planetSeed, face, x, y (int), depth (int, optional) and type (string).',
                $command->type
            ));
        }

        if (!in_array($type, Building::TYPES, true)) {
            return CommandResult::fail(sprintf('Unknown building type "%s".', $type));
        }

        if (!ColonyGrid::isValidCell($face, $x, $y, $depth)) {
            return CommandResult::fail('Invalid colony cell coordinates.');
        }

        $this->store->place($planetSeed, $face, $x, $y, $type);

        $building = $this->resolver->buildingFor($planetSeed, $face, $x, $y, $depth);

        return CommandResult::ok([
            new Event(
                sprintf('building_placed_%s', $command->id),
                'BuildingPlaced',
                [
                    'building' => $building?->toArray(),
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

    private function stringPayload(Command $command, string $key): ?string
    {
        $value = $command->payload[$key] ?? null;

        return is_string($value) ? $value : null;
    }
}
