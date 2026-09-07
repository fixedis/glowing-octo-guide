<?php

declare(strict_types=1);

// src/CoreEngine/Contracts/EngineInterface.php

namespace Project\CoreEngine\Contracts;

interface EngineInterface
{
    public function id(): string;

    public function version(): string;

    public function boot(): void;

    public function shutdown(): void;
}
