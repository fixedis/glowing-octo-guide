<?php

declare(strict_types=1);

// src/Engines/EconomyEngine/EconomyEngine.php

namespace Project\Engines\EconomyEngine;

use Project\CoreEngine\Contracts\RegistrableEngineInterface;
use Project\CoreEngine\Core\CoreServices;
use Project\CoreEngine\Core\EngineRegistration;
use Project\Engines\EconomyEngine\Core\Commands\CollectResourcesHandler;
use Project\Engines\EconomyEngine\Core\Commands\RegisterColonyEconomyHandler;
use Project\Engines\EconomyEngine\Core\Systems\EconomyTickSystem;

/**
 * EconomyEngine — доменный движок ресурсной экономики.
 *
 * Владеет только экономическими данными (добыча/запасы по колониям).
 * Не знает про генерацию вселенной; колония входит в экономику
 * через команду RegisterColonyEconomy (источник — любой внешний модуль
 * или клиент). Все расчёты — в fixed point через MathKernel.
 */
final class EconomyEngine implements RegistrableEngineInterface
{
    public function id(): string
    {
        return 'economy-engine';
    }

    public function version(): string
    {
        return '0.1.0';
    }

    public function register(EngineRegistration $registration, CoreServices $services): void
    {
        $registration->commandHandler(
            'RegisterColonyEconomy',
            new RegisterColonyEconomyHandler()
        );

        $registration->commandHandler(
            'CollectResources',
            new CollectResourcesHandler($services->math)
        );

        $registration->system(
            new EconomyTickSystem($services->math, $services->logger)
        );

        $services->logger->info('EconomyEngine registered.', [
            'version' => $this->version(),
        ]);
    }

    public function boot(): void
    {
    }

    public function shutdown(): void
    {
    }
}
