<?php

declare(strict_types=1);

// src/CoreEngine/Core/Event.php

namespace Project\CoreEngine\Core;

final class Event
{
    /**
     * @param array<string, mixed> $payload
     */
    public function __construct(
        public readonly string $id,
        public readonly string $type,
        public readonly array $payload = [],
        public readonly int $tick = 0
    ) {
    }
}
