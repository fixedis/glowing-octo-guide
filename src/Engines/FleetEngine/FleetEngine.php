<?php

declare(strict_types=1);

// src/Engines/FleetEngine/FleetEngine.php

namespace Project\Engines\FleetEngine;

use Project\CoreEngine\Contracts\RegistrableEngineInterface;
use Project\CoreEngine\Core\CoreServices;
use Project\CoreEngine\Core\EngineRegistration;
use Project\Engines\FleetEngine\Core\Commands\DisembarkFleetHandler;
use Project\Engines\FleetEngine\Core\Commands\FormFleetHandler;
use Project\Engines\FleetEngine\Core\Commands\MoveFleetHandler;

/**
 * FleetEngine — доменный движок флотов.
 *
 * Замыкает цепочку Economy -> Production -> Fleet: формирует флот из произведённых
 * юнитов (production.colony.*.units), перемещает его по координатам (контракт как у
 * UniverseEngine — fixed-point, MAX_COORD) и высаживает десант на планету
 * (universe.spawned.planet.*).
 *
 * Ответственность чётко отделена от соседей (rules.md «Движки» п.4):
 * - спавн кораблей — НЕ наша зона (это SpawnShip в UniverseEngine);
 * - генерация ресурсов/юнитов — НЕ наша зона (EconomyEngine/ProductionEngine).
 * FleetEngine общается через State-контракт: читает production.colony.* и
 * universe.spawned.planet.*, пишет fleet.*. Без прямого вызова чужих движков.
 *
 * Детерминизм: координаты/расстояния целочисленные, RNG не используется.
 */
final class FleetEngine implements RegistrableEngineInterface
{
    public function id(): string
    {
        return 'fleet-engine';
    }

    public function version(): string
    {
        return '0.1.0';
    }

    public function register(EngineRegistration $registration, CoreServices $services): void
    {
        $registration->commandHandler('FormFleet', new FormFleetHandler());
        $registration->commandHandler('MoveFleet', new MoveFleetHandler());
        $registration->commandHandler('DisembarkFleet', new DisembarkFleetHandler());

        $services->logger->info('FleetEngine registered.', [
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
