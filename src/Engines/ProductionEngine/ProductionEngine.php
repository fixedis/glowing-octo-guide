<?php

declare(strict_types=1);

// src/Engines/ProductionEngine/ProductionEngine.php

namespace Project\Engines\ProductionEngine;

use Project\CoreEngine\Contracts\RegistrableEngineInterface;
use Project\CoreEngine\Core\CoreServices;
use Project\CoreEngine\Core\EngineRegistration;
use Project\Engines\ProductionEngine\Core\Commands\ProduceBuildingHandler;
use Project\Engines\ProductionEngine\Core\Commands\ProduceUnitHandler;

/**
 * ProductionEngine — доменный движок производства.
 *
 * Замыкает игровой цикл: превращает накопленные ресурсы (economy.colony.*.stored)
 * в постройки и юниты. Не генерирует ресурсы (это EconomyEngine) и не владеет
 * состоянием колонии напрямую — работает через общий State-контракт:
 * читает/пишет `economy.colony.{seed}.stored` и пишет `production.colony.{seed}`.
 *
 * Производство — по запросу (команда), а не в тике: детерминизм и простота.
 * Стоимость детерминирована (MathKernel, таблица ProductionBlueprint).
 */
final class ProductionEngine implements RegistrableEngineInterface
{
    public function id(): string
    {
        return 'production-engine';
    }

    public function version(): string
    {
        return '0.1.0';
    }

    public function register(EngineRegistration $registration, CoreServices $services): void
    {
        $registration->commandHandler(
            'ProduceBuilding',
            new ProduceBuildingHandler($services->math)
        );

        $registration->commandHandler(
            'ProduceUnit',
            new ProduceUnitHandler($services->math)
        );

        $services->logger->info('ProductionEngine registered.', [
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
