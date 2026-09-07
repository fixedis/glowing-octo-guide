<?php

declare(strict_types=1);

// src/CoreEngine/Core/Logging/NullLogger.php

namespace Project\CoreEngine\Core\Logging;

use Project\CoreEngine\Contracts\LoggerInterface;

final class NullLogger implements LoggerInterface
{
    /**
     * @param array<string, mixed> $context
     */
    public function debug(string $message, array $context = []): void
    {
        // Null logger intentionally does nothing.
    }

    /**
     * @param array<string, mixed> $context
     */
    public function info(string $message, array $context = []): void
    {
        // Null logger intentionally does nothing.
    }

    /**
     * @param array<string, mixed> $context
     */
    public function warning(string $message, array $context = []): void
    {
        // Null logger intentionally does nothing.
    }

    /**
     * @param array<string, mixed> $context
     */
    public function error(string $message, array $context = []): void
    {
        // Null logger intentionally does nothing.
    }
}
