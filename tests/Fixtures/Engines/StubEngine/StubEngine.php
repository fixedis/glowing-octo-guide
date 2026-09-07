<?php

declare(strict_types=1);

// tests/Fixtures/Engines/StubEngine/StubEngine.php

namespace Project\Tests\Fixtures\Engines\StubEngine;

use Project\CoreEngine\Contracts\EngineInterface;

final class StubEngine implements EngineInterface
{
    public function id(): string
    {
        return 'stub-engine';
    }

    public function version(): string
    {
        return '0.1.0';
    }

    public function boot(): void
    {
        // Stub engine boot action.
    }

    public function shutdown(): void
    {
        // Stub engine shutdown action.
    }
}
