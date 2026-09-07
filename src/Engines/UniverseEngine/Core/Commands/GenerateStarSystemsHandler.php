<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Core/Commands/GenerateStarSystemsHandler.php

namespace Project\Engines\UniverseEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;
use Project\Engines\UniverseEngine\Core\RouteGenerator;
use Project\Engines\UniverseEngine\Core\StarSystemGenerator;
use Project\Engines\UniverseEngine\Entities\Systems\StarSystem;

final class GenerateStarSystemsHandler implements CommandHandlerInterface
{
    public function __construct(
        private readonly StarSystemGenerator $systemGenerator,
        private readonly RouteGenerator $routeGenerator
    ) {
    }

    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $galaxySeed = $this->intPayload($command, 'galaxySeed');

        if ($galaxySeed === null) {
            return CommandResult::fail(sprintf(
                'Command "%s" requires integer payload field: galaxySeed.',
                $command->type
            ));
        }

        $galaxyRadius = $this->intPayload($command, 'galaxyRadius') ?? 60;

        $systems = $this->systemGenerator->generateForGalaxy($galaxySeed, $galaxyRadius);
        $routes = $this->routeGenerator->generate($galaxySeed, $systems);

        return CommandResult::ok([
            new Event(
                sprintf('star_systems_%s', $command->id),
                'StarSystemsGenerated',
                [
                    'galaxySeed' => $galaxySeed,
                    'systems' => array_map(
                        static fn (StarSystem $system): array => $system->toArray(),
                        $systems
                    ),
                    'routes' => $routes,
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
