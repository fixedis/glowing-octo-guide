<?php

declare(strict_types=1);

// src/Engines/NaniteEngine/NaniteEngine.php
//
// ДВИЖОК НАНИТ-ЯДРА.
//
// Домен-независимый модуль: реализует RegistrableEngineInterface и подключается
// к CoreEngine через манифест. Регистрирует:
//   - команду EvaluateNaniteFrame (пересчёт бюджета детализации);
//   - тик-систему NaniteBudgetRegulator (саморегуляция бюджета).
//
// Граф зависимостей (NaniteBudgetDirector + тиры) собирается ВНУТРИ register(),
// чтобы конструктор движка не тянул классы, которые контейнер попытается
// авто-резолвить при инстанцировании движка.
//
// Тела (звёзды/планеты/галактики/чанки) приходят извне как данные команды —
// ядро не знает предметной области (философия §5).

namespace Project\Engines\NaniteEngine;

use Project\CoreEngine\Contracts\RegistrableEngineInterface;
use Project\CoreEngine\Core\CoreServices;
use Project\CoreEngine\Core\EngineRegistration;
use Project\Engines\NaniteEngine\Contracts\TierStrategyInterface;
use Project\Engines\NaniteEngine\Core\Commands\EvaluateNaniteFrameHandler;
use Project\Engines\NaniteEngine\Core\NaniteBudgetDirector;
use Project\Engines\NaniteEngine\Core\NaniteBudgetRegulator;
use Project\Engines\NaniteEngine\Core\Tiers\BillboardTierStrategy;
use Project\Engines\NaniteEngine\Core\Tiers\PointTierStrategy;
use Project\Engines\NaniteEngine\Core\Tiers\SurfaceTierStrategy;

final class NaniteEngine implements RegistrableEngineInterface
{
    public function id(): string
    {
        return 'nanite-engine';
    }

    public function version(): string
    {
        return '0.1.0';
    }

    public function register(
        EngineRegistration $registration,
        CoreServices $services
    ): void {
        $tiers = $this->defaultTiers();

        $director = new NaniteBudgetDirector($tiers);

        $registration->commandHandler(
            'EvaluateNaniteFrame',
            new EvaluateNaniteFrameHandler($director)
        );

        $registration->system(
            new NaniteBudgetRegulator($services->state, $services->logger)
        );

        $services->logger->info('NaniteEngine registered: budget director + regulator.', [
            'tiers' => array_map(
                static fn (TierStrategyInterface $t): string => $t->tierName(),
                $tiers
            ),
        ]);
    }

    public function boot(): void
    {
        // Нет boot-time side effects.
    }

    public function shutdown(): void
    {
        // Нет shutdown-time side effects.
    }

    /**
     * @return list<TierStrategyInterface>
     */
    private function defaultTiers(): array
    {
        return [
            new SurfaceTierStrategy(),
            new BillboardTierStrategy(),
            new PointTierStrategy(),
        ];
    }
}
