<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Core/Commands/GenerateGalaxyChunkHandler.php

namespace Project\Engines\UniverseEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;
use Project\Engines\UniverseEngine\Core\GalaxyGenerator;
use Project\Engines\UniverseEngine\Entities\Galaxies\Galaxy;

final class GenerateGalaxyChunkHandler implements CommandHandlerInterface
{
    public function __construct(
        private readonly GalaxyGenerator $generator
    ) {
    }

    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $universeSeed = $this->intPayload($command, 'universeSeed');
        $chunkX = $this->intPayload($command, 'chunkX');
        $chunkY = $this->intPayload($command, 'chunkY');
        $chunkZ = $this->intPayload($command, 'chunkZ');

        if ($universeSeed === null || $chunkX === null || $chunkY === null || $chunkZ === null) {
            return CommandResult::fail(sprintf(
                'Command "%s" requires integer payload fields: universeSeed, chunkX, chunkY, chunkZ.',
                $command->type
            ));
        }

        $galaxies = $this->generator->generateChunk($universeSeed, $chunkX, $chunkY, $chunkZ);

        return CommandResult::ok([
            new Event(
                sprintf('galaxy_chunk_%s', $command->id),
                'GalaxyChunkGenerated',
                [
                    'universeSeed' => $universeSeed,
                    'chunk' => [$chunkX, $chunkY, $chunkZ],
                    'galaxies' => array_map(
                        static fn (Galaxy $galaxy): array => $galaxy->toArray(),
                        $galaxies
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
