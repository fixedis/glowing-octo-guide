<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Core/Commands/GeneratePlanetsHandler.php

namespace Project\Engines\UniverseEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;
use Project\Engines\UniverseEngine\Core\PlanetGenerator;
use Project\Engines\UniverseEngine\Entities\Planets\Planet;

final class GeneratePlanetsHandler implements CommandHandlerInterface
{
    public function __construct(
        private readonly PlanetGenerator $planetGenerator
    ) {
    }

    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $systemSeed = $this->intPayload($command, 'systemSeed');
        $planetCount = $this->intPayload($command, 'planetCount');

        if ($systemSeed === null || $planetCount === null) {
            return CommandResult::fail(sprintf(
                'Command "%s" requires integer payload fields: systemSeed, planetCount.',
                $command->type
            ));
        }

        $planets = $this->planetGenerator->generateForSystem($systemSeed, $planetCount);

        return CommandResult::ok([
            new Event(
                sprintf('planets_%s', $command->id),
                'PlanetsGenerated',
                [
                    'systemSeed' => $systemSeed,
                    'planets' => array_map(
                        static fn (Planet $planet): array => $planet->toArray(),
                        $planets
                    ),
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
