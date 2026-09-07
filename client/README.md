# Universe Client

TypeScript-клиент для UniverseEngine. Строгий режим, детерминированный `SeedGraph` 1:1 с PHP.

## Установка

```bash
cd client
npm install
```

## Тесты

```bash
npm test
```

## Кросс-языковая верификация

`client/src/core/seed-graph.ts` и `src/Engines/UniverseEngine/Core/SeedGraph.php` должны давать
идентичные результаты. Перед релизом запусти:

```bash
C:\OSPanel\modules\php\PHP_8.1\php.exe tools/seed-vectors.php
```

и сравни вывод с `VECTORS` в `client/tests/core/seed-graph.test.ts`.

## Dev-сервер

```bash
npm run dev
```

Проксирует `/api/*` на `http://localhost:8080` (бэкенд должен быть запущен).
