<?php

declare(strict_types=1);

// src/CoreEngine/Core/EngineManifest.php

namespace Project\CoreEngine\Core;

final class EngineManifest
{
    /**
     * @param list<string> $requires
     * @param list<string> $provides
     * @param list<string> $commands
     * @param list<string> $events
     * @param array{
     *     path: string,
     *     interface: string,
     *     autoload: bool
     * }|null $entities
     */
    public function __construct(
        public readonly string $id,
        public readonly string $name,
        public readonly string $version,
        public readonly string $apiVersion,
        public readonly string $engineClass,
        public readonly array $requires,
        public readonly array $provides,
        public readonly array $commands,
        public readonly array $events,
        public readonly ?array $entities,
        public readonly ?string $bridge,
        public readonly string $basePath
    ) {
    }
}
