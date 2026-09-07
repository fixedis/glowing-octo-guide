<?php

declare(strict_types=1);

// src/CoreEngine/Core/Snapshot.php

namespace Project\CoreEngine\Core;

final class Snapshot
{
    /**
     * @param array<string, mixed> $state
     */
    public function __construct(
        public readonly int $tick,
        public readonly array $state,
        public readonly string $hash
    ) {
    }
}
