<?php

declare(strict_types=1);

// src/CoreEngine/Core/CommandResult.php

namespace Project\CoreEngine\Core;

use InvalidArgumentException;

final class CommandResult
{
    /**
     * @param array<Event> $events
     */
    private function __construct(
        public readonly bool $success,
        public readonly ?string $errorMessage,
        public readonly array $events
    ) {
    }

    /**
     * @param array<Event> $events
     */
    public static function ok(array $events = []): self
    {
        self::validateEvents($events);

        return new self(true, null, $events);
    }

    /**
     * @param array<Event> $events
     */
    public static function fail(string $errorMessage, array $events = []): self
    {
        self::validateEvents($events);

        return new self(false, $errorMessage, $events);
    }

    /**
     * @param array<mixed> $events
     */
    private static function validateEvents(array $events): void
    {
        foreach ($events as $event) {
            if (!$event instanceof Event) {
                throw new InvalidArgumentException(
                    'CommandResult events must contain only Event instances.'
                );
            }
        }
    }
}
