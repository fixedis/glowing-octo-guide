<?php

declare(strict_types=1);

// src/Engines/NetworkEngine/NetworkEngine.php

namespace Project\Engines\NetworkEngine;

use Project\CoreEngine\Contracts\LoggerInterface;
use Project\CoreEngine\Contracts\RegistrableEngineInterface;
use Project\CoreEngine\Core\CoreServices;
use Project\CoreEngine\Core\EngineRegistration;
use Project\Engines\NetworkEngine\Presentation\NetworkRouter;

/**
 * NetworkEngine — сетевой фасад CoreEngine.
 *
 * Не содержит игровой логики. Предоставляет универсальный HTTP-роутер,
 * который маппит внешние запросы на команды ядра и даёт read-only доступ
 * к состоянию. Заменяет встроенный HTTP-слой UniverseEngine (техдолг).
 *
 * Сам по себе движок не регистрирует команды/события/системы — роутер
 * создаётся точкой входа (index.php) через статический фабричный метод.
 */
final class NetworkEngine implements RegistrableEngineInterface
{
    public function id(): string
    {
        return 'network-engine';
    }

    public function version(): string
    {
        return '0.1.0';
    }

    public function register(
        EngineRegistration $registration,
        CoreServices $services
    ): void {
        // Нет механизмов для регистрации: NetworkEngine — чистый транспортный фасад.
        // Роутер создаётся явно точкой входа через createRouter().
    }

    public function boot(): void
    {
    }

    public function shutdown(): void
    {
    }

    /**
     * Создаёт сетевой роутер поверх сервисов ядра.
     *
     * @param string|null $adminToken Если задан — команды с префиксом "Admin"
     *                                требуют заголовок X-Admin-Token.
     */
    public static function createRouter(
        CoreServices $services,
        LoggerInterface $logger,
        ?string $adminToken = null
    ): NetworkRouter {
        return new NetworkRouter($services, $logger, $adminToken);
    }
}
