<?php

declare(strict_types=1);

// tests/Fixtures/Engines/RegistrableStubEngine/RegistrableStubEngine.php

namespace Project\Tests\Fixtures\Engines\RegistrableStubEngine;

use Project\CoreEngine\Contracts\RegistrableEngineInterface;
use Project\CoreEngine\Core\CoreServices;
use Project\CoreEngine\Core\EngineRegistration;

final class RegistrableStubEngine implements RegistrableEngineInterface
{
    private bool $registered = false;

    public function id(): string
    {
        return 'registrable-stub-engine';
    }

    public function version(): string
    {
        return '0.1.0';
    }

    public function register(
        EngineRegistration $registration,
        CoreServices $services
    ): void {
        $this->registered = true;

        $services->state->set('registrable_stub_registered', true);
        $services->state->set('registrable_stub_engine_id', $registration->engineId());
    }

    public function boot(): void
    {
        // Stub engine boot action.
    }

    public function shutdown(): void
    {
        // Stub engine shutdown action.
    }

    public function isRegistered(): bool
    {
        return $this->registered;
    }
}
