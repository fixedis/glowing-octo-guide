<?php

declare(strict_types=1);

// src/CoreEngine/Core/Command.php

namespace Project\CoreEngine\Core;

final class Command
{
    /**
     * @param array<string, mixed> $payload
     */
    public function __construct(
        public readonly string $id,
        public readonly string $type,
        public readonly array $payload = [],
        public readonly ?string $actorId = null,
        public readonly ?string $targetId = null,
        public readonly string $version = '1.0.0'
    ) {
    }
}
