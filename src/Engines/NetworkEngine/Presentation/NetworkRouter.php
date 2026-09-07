<?php

declare(strict_types=1);

// src/Engines/NetworkEngine/Presentation/NetworkRouter.php

namespace Project\Engines\NetworkEngine\Presentation;

use InvalidArgumentException;
use Project\CoreEngine\Contracts\LoggerInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CoreServices;
use Throwable;

/**
 * Универсальный сетевой фасад CoreEngine.
 *
 * Заменяет встроенный HTTP-слой UniverseEngine (техдолг). Маршрутизирует
 * внешние HTTP-запросы на команды ядра через CommandBus и предоставляет
 * read-only доступ к состоянию.
 *
 * Поддерживает:
 *  - GET  /api/v1/health
 *  - POST /api/v1/command        {type, payload}  (любая команда ядра)
 *  - GET  /api/v1/state?key=...  (чтение State)
 *  - обратно-совместимые route'ы Universe/Nanite ( galaxy/systems/planets/nanite )
 *
 * Серверная авторизация: если задан env ADMIN_TOKEN, команды с префиксом
 * "Admin" требуют заголовок X-Admin-Token.
 */
final class NetworkRouter
{
    private const ADMIN_PREFIX = 'Admin';

    public function __construct(
        private readonly CoreServices $services,
        private readonly LoggerInterface $logger,
        private readonly ?string $adminToken = null
    ) {
    }

    public function handle(HttpRequest $request): HttpResponse
    {
        $method = strtoupper($request->method);

        $parts = array_values(array_filter(
            explode('/', trim($request->path, '/')),
            static fn (string $segment): bool => $segment !== ''
        ));

        if (($parts[0] ?? '') !== 'api' || ($parts[1] ?? '') !== 'v1') {
            return new HttpResponse(404, ['error' => 'Not found.']);
        }

        $rest = array_slice($parts, 2);

        try {
            return $this->route($method, $rest, $request);
        } catch (InvalidArgumentException $exception) {
            $this->logger->warning('HTTP request rejected.', [
                'method' => $method,
                'path' => $request->path,
                'error' => $exception->getMessage(),
            ]);

            return new HttpResponse(400, ['error' => $exception->getMessage()]);
        } catch (Throwable $exception) {
            $this->logger->error('HTTP request failed.', [
                'method' => $method,
                'path' => $request->path,
                'error' => $exception->getMessage(),
            ]);

            return new HttpResponse(500, ['error' => 'Internal server error.']);
        }
    }

    /**
     * @param list<string> $rest
     */
    private function route(string $method, array $rest, HttpRequest $request): HttpResponse
    {
        if ($method === 'GET' && $rest === ['health']) {
            return $this->health();
        }

        if ($method === 'POST' && $rest === ['command']) {
            return $this->handleCommand($request);
        }

        if ($method === 'GET' && $rest === ['state']) {
            return $this->handleState($request);
        }

        // Обратная совместимость с UniverseRouter.
        if ($method === 'GET' && $rest === ['universe', 'galaxies']) {
            return $this->dispatch('GenerateGalaxyChunk', [
                'universeSeed' => $this->intFrom($request->query, 'seed'),
                'chunkX' => $this->intFrom($request->query, 'cx'),
                'chunkY' => $this->intFrom($request->query, 'cy'),
                'chunkZ' => $this->intFrom($request->query, 'cz'),
            ]);
        }

        if ($method === 'GET' && count($rest) === 3 && $rest[0] === 'galaxies' && $rest[2] === 'systems') {
            $payload = ['galaxySeed' => $this->intSegment($rest[1])];

            if (isset($request->query['radius'])) {
                $payload['galaxyRadius'] = $this->intFrom($request->query, 'radius');
            }

            return $this->dispatch('GenerateStarSystems', $payload);
        }

        if ($method === 'GET' && count($rest) === 3 && $rest[0] === 'systems' && $rest[2] === 'planets') {
            return $this->dispatch('GeneratePlanets', [
                'systemSeed' => $this->intSegment($rest[1]),
                'planetCount' => $this->intFrom($request->query, 'count'),
            ]);
        }

        if ($method === 'GET' && count($rest) === 3 && $rest[0] === 'planets' && $rest[2] === 'colony') {
            return $this->dispatch('GenerateColonyArea', [
                'planetSeed' => $this->intSegment($rest[1]),
                'face' => $this->intFrom($request->query, 'face'),
                'depth' => $this->intFrom($request->query, 'depth'),
                'x' => $this->intFrom($request->query, 'x'),
                'y' => $this->intFrom($request->query, 'y'),
                'size' => $this->intFrom($request->query, 'size'),
            ]);
        }

        if ($method === 'POST' && count($rest) === 4 && $rest[0] === 'planets' && $rest[2] === 'colony' && $rest[3] === 'place') {
            $payload = [
                'planetSeed' => $this->intSegment($rest[1]),
                'face' => $this->intFrom($request->body, 'face'),
                'x' => $this->intFrom($request->body, 'x'),
                'y' => $this->intFrom($request->body, 'y'),
                'type' => $this->strFrom($request->body, 'type'),
            ];

            if (isset($request->body['depth'])) {
                $payload['depth'] = $this->intFrom($request->body, 'depth');
            }

            return $this->dispatch('PlaceBuilding', $payload);
        }

        if ($method === 'POST' && count($rest) === 4 && $rest[0] === 'planets' && $rest[2] === 'colony' && $rest[3] === 'demolish') {
            return $this->dispatch('DemolishBuilding', [
                'planetSeed' => $this->intSegment($rest[1]),
                'face' => $this->intFrom($request->body, 'face'),
                'depth' => $this->intFrom($request->body, 'depth'),
                'x' => $this->intFrom($request->body, 'x'),
                'y' => $this->intFrom($request->body, 'y'),
            ]);
        }

        if ($method === 'POST' && $rest === ['nanite', 'frame']) {
            return $this->handleNaniteFrame($request);
        }

        // Управление временем симуляции (Kernel time-control) — только для админа.
        if ($method === 'GET' && $rest === ['kernel', 'status']) {
            return $this->kernelStatus();
        }

        if ($method === 'POST' && $rest === ['kernel', 'pause']) {
            if (!$this->authorizeAdmin('Admin', $request)) {
                return new HttpResponse(403, ['error' => 'Admin authentication required.']);
            }
            $this->services->kernel->pause();

            return $this->kernelStatus();
        }

        if ($method === 'POST' && $rest === ['kernel', 'resume']) {
            if (!$this->authorizeAdmin('Admin', $request)) {
                return new HttpResponse(403, ['error' => 'Admin authentication required.']);
            }
            $this->services->kernel->resume();

            return $this->kernelStatus();
        }

        if ($method === 'POST' && $rest === ['kernel', 'step']) {
            if (!$this->authorizeAdmin('Admin', $request)) {
                return new HttpResponse(403, ['error' => 'Admin authentication required.']);
            }
            $snapshot = $this->services->kernel->step();

            return new HttpResponse(200, [
                'tick' => $snapshot->tick,
                'hash' => $snapshot->hash,
                'paused' => $this->services->kernel->isPaused(),
                'speed' => $this->services->kernel->getSpeed(),
            ]);
        }

        return new HttpResponse(404, ['error' => 'Not found.']);
    }

    private function kernelStatus(): HttpResponse
    {
        return new HttpResponse(200, [
            'tick' => $this->services->kernel->currentTick(),
            'paused' => $this->services->kernel->isPaused(),
            'speed' => $this->services->kernel->getSpeed(),
        ]);
    }

    private function handleCommand(HttpRequest $request): HttpResponse
    {
        $type = $request->body['type'] ?? null;
        $payload = $request->body['payload'] ?? [];

        if (!is_string($type) || trim($type) === '') {
            return new HttpResponse(400, ['error' => 'Body must contain string "type".']);
        }

        if (!is_array($payload)) {
            return new HttpResponse(400, ['error' => 'Body "payload" must be an object.']);
        }

        if (!$this->authorizeAdmin($type, $request)) {
            return new HttpResponse(403, ['error' => 'Admin authentication required.']);
        }

        return $this->dispatch($type, $payload);
    }

    private function handleState(HttpRequest $request): HttpResponse
    {
        $key = $request->query['key'] ?? null;

        if (is_string($key) && $key !== '') {
            if (!$this->services->state->has($key)) {
                return new HttpResponse(404, ['error' => sprintf('State key "%s" not found.', $key)]);
            }

            return new HttpResponse(200, [
                'key' => $key,
                'value' => $this->services->state->get($key),
            ]);
        }

        // Без key — только для админа: возвращает весь State (для админки/просмотра).
        if (!$this->authorizeAdmin('Admin', $request)) {
            return new HttpResponse(403, ['error' => 'Admin authentication required.']);
        }

        return new HttpResponse(200, [
            'all' => $this->services->state->all(),
        ]);
    }

    private function authorizeAdmin(string $commandType, HttpRequest $request): bool
    {
        if ($this->adminToken === null) {
            return true; // Auth отключён (dev-режим).
        }

        if (str_starts_with($commandType, self::ADMIN_PREFIX)) {
            return $request->header('x-admin-token') === $this->adminToken;
        }

        return true;
    }

    private function handleNaniteFrame(HttpRequest $request): HttpResponse
    {
        $entities = $request->body['entities'] ?? null;

        if (!is_array($entities) || $entities === []) {
            return new HttpResponse(400, [
                'error' => 'Body must contain non-empty "entities" array.',
            ]);
        }

        $normalized = [];

        foreach ($entities as $entry) {
            if (!is_array($entry)) {
                return new HttpResponse(400, ['error' => 'Each entity must be an object.']);
            }

            $id = $entry['id'] ?? null;
            $screenPx = $entry['screenPx'] ?? null;
            $baseRadius = $entry['baseRadius'] ?? null;

            if (!is_string($id) || !is_int($screenPx) || !is_int($baseRadius)) {
                return new HttpResponse(400, [
                    'error' => 'Entity requires string "id", int "screenPx", int "baseRadius".',
                ]);
            }

            $normalized[] = [
                'id' => $id,
                'screenPx' => max(0, $screenPx),
                'baseRadius' => max(1, $baseRadius),
            ];
        }

        $payload = ['entities' => $normalized];

        $focusId = $request->body['focusId'] ?? null;
        if (is_string($focusId) && $focusId !== '') {
            $payload['focusId'] = $focusId;
        }

        return $this->dispatch('EvaluateNaniteFrame', $payload);
    }

    private function health(): HttpResponse
    {
        $engines = [];

        foreach ($this->services->engineRegistry->all() as $engine) {
            $engines[] = [
                'id' => $engine->id(),
                'version' => $engine->version(),
            ];
        }

        return new HttpResponse(200, [
            'status' => 'ok',
            'engines' => $engines,
        ]);
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function dispatch(string $commandType, array $payload): HttpResponse
    {
        $command = new Command(
            'http_' . bin2hex(random_bytes(8)),
            $commandType,
            $payload
        );

        $result = $this->services->commandBus->dispatch($command, $this->services->state);

        if (!$result->success) {
            return new HttpResponse(422, [
                'error' => $result->errorMessage ?? 'Command rejected.',
            ]);
        }

        $event = $result->events[0] ?? null;

        return new HttpResponse(200, [
            'data' => $event?->payload ?? [],
            'meta' => [
                'command' => $commandType,
                'tick' => $event?->tick ?? 0,
            ],
        ]);
    }

    /**
     * @param array<string, mixed> $source
     */
    private function intFrom(array $source, string $key): int
    {
        $value = $source[$key] ?? null;

        if (!is_numeric($value)) {
            throw new InvalidArgumentException(sprintf(
                'Missing or invalid integer parameter "%s".',
                $key
            ));
        }

        return (int) $value;
    }

    /**
     * @param array<string, mixed> $source
     */
    private function strFrom(array $source, string $key): string
    {
        $value = $source[$key] ?? null;

        if (!is_string($value) || trim($value) === '') {
            throw new InvalidArgumentException(sprintf(
                'Missing or invalid string parameter "%s".',
                $key
            ));
        }

        return trim($value);
    }

    private function intSegment(string $value): int
    {
        if (!is_numeric($value)) {
            throw new InvalidArgumentException(sprintf(
                'Invalid path segment "%s": integer expected.',
                $value
            ));
        }

        return (int) $value;
    }
}
