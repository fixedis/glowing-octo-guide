<?php

declare(strict_types=1);

// public/index.php

use Project\CoreEngine\Core\CoreEngineBootstrap;
use Project\CoreEngine\Core\Logging\NullLogger;
use Project\CoreEngine\Core\RuntimeStateStore;
use Project\Engines\NetworkEngine\NetworkEngine;
use Project\Engines\NetworkEngine\Presentation\HttpRequest;
use Project\Engines\NetworkEngine\Presentation\HttpResponse;

require __DIR__ . '/../vendor/autoload.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Token');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$logger = new NullLogger();

// Для защиты admin-команд задай:
// ADMIN_TOKEN=секретный_токен  (тогда Admin* команды требуют X-Admin-Token)
$adminToken = getenv('ADMIN_TOKEN');
$adminToken = is_string($adminToken) && $adminToken !== '' ? $adminToken : null;

// Persistent runtime: при PERSISTENT_RUNTIME=1 ядро восстанавливает накопленное
// состояние (tick + State) из RuntimeStateStore на каждом запросе и сохраняет
// после каждой команды/шага. Решает проблему per-request php -S: админка,
// godmode-флаги и накопленная симуляция переживают между HTTP-запросами.
//
// ВНИМАНИЕ: php -S (built-in server) НЕ наследует env-переменные в дочернем
// обработчике запроса. Поэтому флаг читается из env ИЛИ из файла-маркера
// public/.persistent-runtime (создётся при старте сервера через run script).
$persistent = false;
$envFlag = getenv('PERSISTENT_RUNTIME');
if (is_string($envFlag) && $envFlag !== '' && $envFlag !== '0') {
    $persistent = true;
}
if (!$persistent && is_file(__DIR__ . '/.persistent-runtime')) {
    $persistent = true;
}

$bootstrap = new CoreEngineBootstrap($logger);
$runtime = $bootstrap->createRuntime(
    dirname(__DIR__) . '/src/Engines',
    'http-universe-seed'
);

$services = $runtime->services;
$kernel = $runtime->kernel;

$stateStore = $services->container->get(RuntimeStateStore::class);

if ($persistent) {
    $restored = $stateStore->loadState();

    if ($restored !== null) {
        $restoredTick = (int) ($restored['tick'] ?? 0);
        unset($restored['tick']);
        // Восстанавливаем State + тик без перезапуска движков.
        $kernel->restoreFromState($restoredTick, $restored);
    }
}

$router = NetworkEngine::createRouter($services, $logger, $adminToken);

$response = $router->handle(HttpRequest::fromGlobals());

// В persistent-режиме сохраняем живое состояние после каждого запроса,
// чтобы следующий HTTP-запрос его подхватил (rolling-state).
if ($persistent) {
    $liveState = $services->state->all();
    $liveState['tick'] = $kernel->currentTick();
    $stateStore->saveState($liveState);
}

$response->send();
