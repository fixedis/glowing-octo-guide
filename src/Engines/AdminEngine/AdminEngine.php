<?php

declare(strict_types=1);

// src/Engines/AdminEngine/AdminEngine.php

namespace Project\Engines\AdminEngine;

use Project\CoreEngine\Contracts\RegistrableEngineInterface;
use Project\CoreEngine\Core\CoreServices;
use Project\CoreEngine\Core\EngineRegistration;
use Project\Engines\AdminEngine\Core\Commands\AdminAuthenticateHandler;
use Project\Engines\AdminEngine\Core\Commands\AdminSetGodModeHandler;
use Project\Engines\AdminEngine\Core\Commands\AdminEditEconomyHandler;
use Project\Engines\AdminEngine\Core\Commands\AdminGrantResourcesHandler;
use Project\Engines\AdminEngine\Core\Commands\AdminSetNaniteBudgetHandler;
use Project\Engines\AdminEngine\Core\Commands\AdminSaveSnapshotHandler;
use Project\Engines\AdminEngine\Core\Commands\AdminLoadSnapshotHandler;

/**
 * AdminEngine — серверный модуль администрирования.
 *
 * Не содержит игровой логики. Управляет флагами (godmode, session), редактирует
 * данные других движков через их состояние (Economy/Nanite) и управляет
 * снапшотами. Все команды с префиксом "Admin" требуют авторизации на уровне
 * NetworkEngine (X-Admin-Token), если задан env ADMIN_TOKEN.
 */
final class AdminEngine implements RegistrableEngineInterface
{
    public function id(): string
    {
        return 'admin-engine';
    }

    public function version(): string
    {
        return '0.1.0';
    }

    public function register(
        EngineRegistration $registration,
        CoreServices $services
    ): void {
        $adminToken = getenv('ADMIN_TOKEN');
        $expectedToken = is_string($adminToken) && $adminToken !== '' ? $adminToken : null;

        $registration->commandHandler(
            'AdminAuthenticate',
            new AdminAuthenticateHandler($expectedToken)
        );

        $registration->commandHandler(
            'AdminSetGodMode',
            new AdminSetGodModeHandler()
        );

        $registration->commandHandler(
            'AdminEditEconomy',
            new AdminEditEconomyHandler()
        );

        $registration->commandHandler(
            'AdminGrantResources',
            new AdminGrantResourcesHandler()
        );

        $registration->commandHandler(
            'AdminSetNaniteBudget',
            new AdminSetNaniteBudgetHandler()
        );

        $registration->commandHandler(
            'AdminSaveSnapshot',
            new AdminSaveSnapshotHandler($services->snapshots)
        );

        $registration->commandHandler(
            'AdminLoadSnapshot',
            new AdminLoadSnapshotHandler($services->snapshots)
        );

        $services->logger->info('AdminEngine registered.', [
            'auth' => $expectedToken !== null ? 'enabled' : 'disabled',
        ]);
    }

    public function boot(): void
    {
    }

    public function shutdown(): void
    {
    }
}
