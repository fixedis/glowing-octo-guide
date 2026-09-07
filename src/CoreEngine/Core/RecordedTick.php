<?php

declare(strict_types=1);

// src/CoreEngine/Core/RecordedTick.php

namespace Project\CoreEngine\Core;

use JsonSerializable;

/**
 * Сериализуемая запись одного тика для replay.
 *
 * @implements JsonSerializable<array{tick:int,commands:list<array>,hash:string}>
 */
final class RecordedTick implements JsonSerializable
{
    /**
     * @param list<Command> $commands
     */
    public function __construct(
        public readonly int $tick,
        public readonly array $commands,
        public readonly string $hash
    ) {
    }

    /**
     * @return array{tick:int,commands:list<array>,hash:string}
     */
    public function jsonSerialize(): array
    {
        $commands = [];

        foreach ($this->commands as $command) {
            $commands[] = [
                'id' => $command->id,
                'type' => $command->type,
                'payload' => $command->payload,
                'actorId' => $command->actorId,
                'targetId' => $command->targetId,
                'version' => $command->version,
            ];
        }

        return [
            'tick' => $this->tick,
            'commands' => $commands,
            'hash' => $this->hash,
        ];
    }
}
