<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Presentation/HttpResponse.php

namespace Project\Engines\UniverseEngine\Presentation;

final class HttpResponse
{
    /**
     * @param array<string, mixed> $payload
     */
    public function __construct(
        public readonly int $status,
        public readonly array $payload
    ) {
    }

    public function json(): string
    {
        return json_encode(
            $this->payload,
            JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
        );
    }
}
