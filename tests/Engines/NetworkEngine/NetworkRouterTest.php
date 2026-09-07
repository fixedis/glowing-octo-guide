<?php

declare(strict_types=1);

// tests/Engines/NetworkEngine/NetworkRouterTest.php

namespace Project\Tests\Engines\NetworkEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\CoreEngineBootstrap;
use Project\CoreEngine\Core\Logging\NullLogger;
use Project\Engines\NetworkEngine\NetworkEngine;
use Project\Engines\NetworkEngine\Presentation\HttpRequest;
use Project\Engines\NetworkEngine\Presentation\HttpResponse;

final class NetworkRouterTest extends TestCase
{
    private function router(?string $adminToken = null): \Project\Engines\NetworkEngine\Presentation\NetworkRouter
    {
        // NetworkEngine сам по себе не несёт состояния; фабрика роутера
        // требует CoreServices из рантайма.
        $bootstrap = new CoreEngineBootstrap(new NullLogger());
        $runtime = $bootstrap->createRuntime(__DIR__ . '/../../../src/Engines', 'network-test');

        return NetworkEngine::createRouter($runtime->services, new NullLogger(), $adminToken);
    }

    private function json(HttpResponse $response): array
    {
        return json_decode($response->json(), true);
    }

    public function testHealthListsAllEngines(): void
    {
        $router = $this->router();
        $response = $router->handle(new HttpRequest('GET', '/api/v1/health'));

        self::assertSame(200, $response->status);
        $data = $this->json($response);
        $ids = array_column($data['engines'], 'id');

        self::assertContains('network-engine', $ids);
        self::assertContains('universe-engine', $ids);
        self::assertContains('nanite-engine', $ids);
        self::assertContains('economy-engine', $ids);
    }

    public function testUniversalCommandDispatch(): void
    {
        $router = $this->router();
        $response = $router->handle(new HttpRequest(
            'POST',
            '/api/v1/command',
            [],
            ['type' => 'RegisterColonyEconomy', 'payload' => ['planetSeed' => 42, 'baseYield' => 500000]]
        ));

        self::assertSame(200, $response->status);
        $data = $this->json($response);
        self::assertSame('RegisterColonyEconomy', $data['meta']['command']);
        self::assertSame(42, $data['data']['planetSeed']);
    }

    public function testUniversalCommandMissingTypeFails(): void
    {
        $router = $this->router();
        $response = $router->handle(new HttpRequest('POST', '/api/v1/command', [], []));

        self::assertSame(400, $response->status);
    }

    public function testStateReadUnknownKeyReturns404(): void
    {
        $router = $this->router();
        $response = $router->handle(new HttpRequest('GET', '/api/v1/state', ['key' => 'nope']));

        self::assertSame(404, $response->status);
    }

    public function testStateReadRequiresKeyOrAdmin(): void
    {
        // Без key и без admin-токена — 403 (чтение всего state только для админа).
        $router = $this->router('secret-token');
        $response = $router->handle(new HttpRequest('GET', '/api/v1/state', []));
        self::assertSame(403, $response->status);

        // С admin-токеном — 200 + весь state.
        $response = $router->handle(new HttpRequest(
            'GET',
            '/api/v1/state',
            [],
            [],
            ['x-admin-token' => 'secret-token']
        ));
        self::assertSame(200, $response->status);
        self::assertArrayHasKey('all', $response->payload);

        // Чтение конкретного ключа без токена — доступно (400 только если ключ не задан).
        $routerOpen = $this->router(); // auth отключён (dev)
        $response = $routerOpen->handle(new HttpRequest('GET', '/api/v1/state', ['key' => 'nope']));
        self::assertSame(404, $response->status);
    }

    public function testAdminCommandRejectedWithoutToken(): void
    {
        // Auth включён (adminToken задан). Команда с префиксом Admin без токена → 403.
        $router = $this->router('secret-token');
        $response = $router->handle(new HttpRequest(
            'POST',
            '/api/v1/command',
            [],
            ['type' => 'AdminTest', 'payload' => []]
        ));

        self::assertSame(403, $response->status);
    }

    public function testAdminCommandAcceptedWithToken(): void
    {
        // С токеном авторизация пройдена; дальше команда не зарегистрирована → 422 (ошибка диспетчера).
        $router = $this->router('secret-token');
        $response = $router->handle(new HttpRequest(
            'POST',
            '/api/v1/command',
            [],
            ['type' => 'AdminTest', 'payload' => []],
            ['x-admin-token' => 'secret-token']
        ));

        self::assertNotSame(403, $response->status);
    }

    public function testAdminAuthDisabledWithoutTokenEnv(): void
    {
        // Auth отключён (adminToken = null) → префикс Admin не блокируется.
        $router = $this->router(null);
        $response = $router->handle(new HttpRequest(
            'POST',
            '/api/v1/command',
            [],
            ['type' => 'AdminTest', 'payload' => []]
        ));

        self::assertNotSame(403, $response->status);
    }

    public function testKernelStatusOpen(): void
    {
        $router = $this->router();
        $response = $router->handle(new HttpRequest('GET', '/api/v1/kernel/status'));
        self::assertSame(200, $response->status);
        self::assertArrayHasKey('tick', $response->payload);
        self::assertArrayHasKey('paused', $response->payload);
        self::assertArrayHasKey('speed', $response->payload);
    }

    public function testKernelControlRequiresAdmin(): void
    {
        // Auth включён → kernel/pause без токена → 403.
        $router = $this->router('secret-token');
        $response = $router->handle(new HttpRequest('POST', '/api/v1/kernel/pause'));
        self::assertSame(403, $response->status);

        // С токеном → 200, симуляция на паузе.
        $response = $router->handle(new HttpRequest(
            'POST',
            '/api/v1/kernel/pause',
            [],
            [],
            ['x-admin-token' => 'secret-token']
        ));
        self::assertSame(200, $response->status);
        self::assertTrue($response->payload['paused']);

        // Resume возвращает управление.
        $response = $router->handle(new HttpRequest(
            'POST',
            '/api/v1/kernel/resume',
            [],
            [],
            ['x-admin-token' => 'secret-token']
        ));
        self::assertSame(200, $response->status);
        self::assertFalse($response->payload['paused']);
    }

    public function testKernelStepAdvancesTick(): void
    {
        // Auth отключён → шаг тика проходит.
        $router = $this->router(null);
        $response = $router->handle(new HttpRequest('POST', '/api/v1/kernel/step'));
        self::assertSame(200, $response->status);
        self::assertSame(1, $response->payload['tick']);
    }
}
