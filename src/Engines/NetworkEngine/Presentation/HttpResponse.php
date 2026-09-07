<?php

declare(strict_types=1);

// src/Engines/NetworkEngine/Presentation/HttpResponse.php

namespace Project\Engines\NetworkEngine\Presentation;

/**
 * HTTP-ответ с JSON-полезной нагрузкой.
 */
final class HttpResponse
{
    /**
     * @param array<string, mixed> $payload
     * @param array<string, string> $headers
     */
    public function __construct(
        public readonly int $status,
        public readonly array $payload,
        public readonly array $headers = []
    ) {
    }

    public function json(): string
    {
        return json_encode(
            $this->payload,
            JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
        );
    }

    public function send(): void
    {
        http_response_code($this->status);

        header('Content-Type: application/json; charset=utf-8');

        foreach ($this->headers as $name => $value) {
            header(sprintf('%s: %s', $name, $value));
        }

        echo $this->json();
    }
}
