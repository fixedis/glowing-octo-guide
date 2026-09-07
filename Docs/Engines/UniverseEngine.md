<!-- Docs/Engines/UniverseEngine.md -->

# Документация UniverseEngine (v0.4.0)

Доменный движок процедурной генерации вселенной. Подключается к CoreEngine
через манифест `src/Engines/UniverseEngine/Config/engine.manifest.json` и
реализует `Project\CoreEngine\Contracts\RegistrableEngineInterface`.

Философия: движок **не содержит боевой симуляции и не отсвечивает за графику**.
Он вычисляет авторитетные данные (галактики, системы, планеты, постройки) и
визуальные варианты, детерминированные seed-ом, чтобы клиент (TypeScript)
рисовал ровно то же самое без пересчёта.

---

## 1. Ответственность движка

| Что делает | Что НЕ делает |
|---|---|
| Генерация галактик, звёздных систем, планет | Графику / рендеринг (это зона клиента) |
| Генерация маршрутного графа (гиперсеть) | Бой / экономику / сеть (отдельные движки) |
| Процедурная генерация колоний + дельты игрока | Прямую запись в базу / сеть (только через state/store) |
| HTTP-адаптер (REST → команды ядра) | Изменение чужого состояния напрямую |

---

## 2. Структура модуля

```text
src/Engines/UniverseEngine/
    UniverseEngine.php              # класс движка (RegistrableEngineInterface)
    Contracts/
        IUniverseEntity.php         # контракт сущностей (entityId/seed)
        BuildingDeltaStoreInterface # хранилище дельт построек
    Core/
        SeedGraph.php               # детерминированный RNG (FNV-1a + mulberry32)
        GalaxyGenerator.php         # генерация чанка галактик
        GalaxyShape.php             # форма спирали (синхронна с TS-клиентом)
        StarSystemGenerator.php     # системы вдоль спиральных рукавов
        PlanetGenerator.php         # планеты системы + визуальный variant
        RouteGenerator.php          # MST + планарные «гиперсетевые» связи
        Colony/
            ColonyResolver.php      # дельта ?? процедурная генерация
            ColonyGenerator.php     # процедурная клетка колонии
            ColonyGrid.php          # кубосфера (face, x, y, depth)
            InMemoryBuildingDeltaStore.php
            FileBuildingDeltaStore.php
        Commands/
            GenerateGalaxyChunkHandler.php
            GenerateStarSystemsHandler.php
            GeneratePlanetsHandler.php
            GenerateColonyAreaHandler.php
            PlaceBuildingHandler.php
            DemolishBuildingHandler.php
    Entities/
        Galaxies/Galaxy.php
        Systems/StarSystem.php
        Planets/Planet.php
        Buildings/Building.php
    Presentation/
        UniverseRouter.php          # REST-адаптер [DEPRECATED — заменён NetworkRouter в NetworkEngine]
        HttpRequest.php
        HttpResponse.php
    Config/
        engine.manifest.json
```

---

## 3. Регистрация механизмов

`UniverseEngine::register()` собирает граф зависимостей внутри себя (чтобы
конструктор движка не тянул классы, которые контейнер попытается авто-резолвить)
и регистрирует 6 командных обработчиков через `EngineRegistration`.

```php
$registration->commandHandler('GenerateGalaxyChunk', new GenerateGalaxyChunkHandler(new GalaxyGenerator($seedGraph)));
$registration->commandHandler('GenerateStarSystems', new GenerateStarSystemsHandler(new StarSystemGenerator($seedGraph), new RouteGenerator($seedGraph)));
$registration->commandHandler('GeneratePlanets', new GeneratePlanetsHandler(new PlanetGenerator($seedGraph)));
$registration->commandHandler('GenerateColonyArea', new GenerateColonyAreaHandler($colonyResolver));
$registration->commandHandler('PlaceBuilding', new PlaceBuildingHandler($colonyResolver, $deltaStore));
$registration->commandHandler('DemolishBuilding', new DemolishBuildingHandler($deltaStore));
```

`boot()` / `shutdown()` — без побочных эффектов (генерация происходит по командам).

---

## 4. Команды и события

| Команда | Payload (обязательное) | Событие | Содержимое события |
|---|---|---|---|
| `GenerateGalaxyChunk` | `universeSeed, chunkX, chunkY, chunkZ: int` | `GalaxyChunkGenerated` | `galaxies[]` (toArray) |
| `GenerateStarSystems` | `galaxySeed: int, galaxyRadius?: int` | `StarSystemsGenerated` | `systems[]`, `routes[]` |
| `GeneratePlanets` | `systemSeed: int, planetCount?: int` | `PlanetsGenerated` (имя из манифеста `commands`/`events`) | `planets[]` |
| `GenerateColonyArea` | `planetSeed, face, depth, x, y, size: int` | `ColonyAreaGenerated` | `buildings[]` |
| `PlaceBuilding` | `planetSeed, face, x, y: int, type: string, depth?: int` | `BuildingPlaced` | `building?` |
| `DemolishBuilding` | `planetSeed, face, x, y, depth: int` | `BuildingDemolished` | координаты снесённой |

Все обработчики: валидируют целочисленный/строковый payload на границе, при
ошибке возвращают `CommandResult::fail()` (без бросания исключений наружу).

---

## 5. Детерминизм: SeedGraph

`SeedGraph` — собственный RNG движка (FNV-1a хэш + `mulberry32`). Алгоритм
**побайтово совпадает** с TypeScript-реализацией на клиенте. Это ключевая связка
сервера и клиента: серверные звёздные системы ложатся ровно на те же спиральные
рукава, что частицы визуала.

Порядок потребления RNG строго фиксирован:
- `GalaxyShape::create()` → `'galaxy/{seed}/mortis'`
- `GalaxyGenerator` → `'{hashInts(universeSeed,chunkX,chunkY,chunkZ)}'`
- `StarSystemGenerator` → `'galaxy/{seed}/systems'`
- `PlanetGenerator` → `'system/{seed}/planets'` (variant берётся из того же потока)
- `RouteGenerator` → `'galaxy/{seed}/routes'`
- `ColonyGenerator` → `'planet/{seed}/colony'`, `'planet/{seed}/density'`,
  `'planet/{seed}/cell/{face}/{x}/{y}/{depth}'`

> Примечание: движок намеренно НЕ использует `DeterministicRandomInterface`
> ядра — см. «Замечания» (Docs/Engines/REMARKS.md), пункт про RNG.

---

## 6. Генерация вселенной

### 6.1 Галактики (`GalaxyGenerator`)
«Плоский пол» XZ: высота Y — тонкий слой (±150, `HEIGHT_SPREAD`). Каталожные
префиксы `NGC/UGC/PGC/IC/MCG/ESO`. Типы: `spiral`, `elliptical`, `irregular`.
В пустых чанках систем нет (распределение по всей плоскости).

### 6.2 Звёздные системы (`StarSystemGenerator`)
Раскладываются **вдоль спиральных рукавов** через `GalaxyShape` (та же геометрия,
что у клиентских частиц). ~12% систем — «полевые» (вне рукавов). Минимальная
дистанция между системами = `max(4, 0.08 * radius)`. Число планет — взвешенная
рулетка с пиком 3–5. Спектральные классы O→M по убыванию вероятности.

### 6.3 Планеты (`PlanetGenerator`)
Типы: `terran/ice/lava/gas/moon` + радиусы. Визуальный `variant` (например,
`earth_like`, `gas_giant`) детерминированно берётся из того же RNG-потока и
отдаётся клиенту готовой строкой — клиент не пересчитывает. Орбитальные
параметры (`eccentricityFixed`, `inclinationFixed`) — fixed-point в диапазоне
`[0, 1_000_000]`.

### 6.4 Маршруты (`RouteGenerator`)
Граф: евклидово MST (алгоритм Прима, без пересечений) + планарные связи в стиле
Stellaris-гиперсети (35–65% дополнительных рёбер поверх MST). Перемешивание
Фишера—Йетса на seed-rng. Запрет длинных коллинеарных цепочек (допуск 8°).

---

## 7. Слой колоний

- `ColonyGrid` — кубосфера: `(face 0..5, x, y)` на глубине `depth`
  (сторона `1 << depth`, `MAX_DEPTH = 8`). `isValidCell()` — граничная валидация.
- `ColonyResolver::resolveCell()` — композиция: `дельта игрока ?? процедурная генерация`.
- `BuildingDeltaStoreInterface` — две имплементации:
  - `InMemoryBuildingDeltaStore` — рантайм/тесты.
  - `FileBuildingDeltaStore` — один JSON (`planet_{seed}.json`) на планету,
    с валидацией структуры и `LOCK_EX`. Выбор стора: env `UNIVERSE_DELTA_PATH`
    в `UniverseEngine::resolveDeltaStore()`; по умолчанию — in-memory.
- `Building` — сущность со `TYPES` (`dome/extractor/power/turret/tower/landing_pad`),
  реализует `IUniverseEntity`.

---

## 8. HTTP-презентация (`UniverseRouter`) — DEPRECATED

> REST-адаптер `UniverseRouter` **больше не используется**. HTTP-слой вынесен в
> `NetworkEngine` (`NetworkRouter`), который является единым фасадом для всех движков.
> `UniverseRouter` оставлен как исторический артефакт + тесты обратной совместимости.

REST-адаптер, маппит HTTP-запросы на команды ядра через `CommandBus`.
Конструктор принимает `CoreServices` + `LoggerInterface` (тестируемо);
`HttpRequest::fromGlobals()` привязывает к SAPI (`$_SERVER`, `$_GET`, `php://input`).

Маршруты (префикс `/api/v1`):
- `GET /health`
- `GET /universe/galaxies?seed&cx&cy&cz` → `GenerateGalaxyChunk`
- `GET /galaxies/{id}/systems?radius` → `GenerateStarSystems`
- `GET /systems/{id}/planets?count` → `GeneratePlanets`
- `GET /planets/{id}/colony?face&depth&x&y&size` → `GenerateColonyArea`
- `POST /planets/{id}/colony/place` → `PlaceBuilding`
- `POST /planets/{id}/colony/demolish` → `DemolishBuilding`
- `POST /nanite/frame` → `EvaluateNaniteFrame` (NaniteEngine, через CommandBus)

> Важно: межмодульное взаимодействие с NaniteEngine идёт **строго через
> CommandBus** (разрешено архитектурой). Router сам state не меняет — только
> диспатчит команды. См. «Замечания» про расположение HTTP-слоя внутри движка.

---

## 9. Сущности

Все реализуют `IUniverseEntity` (`entityId(): string`, `seed(): int`) и имеют
`toArray()` для сериализации в события/снапшоты:

| Сущность | Ключевые поля |
|---|---|
| `Galaxy` | seed, name, type, x, y, z, radius |
| `StarSystem` | seed, name, spectralType, x, y, z, planetCount |
| `Planet` | seed, index, type, radiusKm, semiMajorAxisAuMilli, eccentricityFixed, inclinationFixed, variant |
| `Building` | seed, planetSeed, face, x, y, depth, type |

---

## 10. Расширение движка

1. Добавить класс генератора в `Core/` (чистая функция над `SeedGraph`).
2. Добавить команду в `Core/Commands/` (реализовать `CommandHandlerInterface`,
   валидировать payload, вернуть `CommandResult::ok([Event])`).
3. Зарегистрировать обработчик в `UniverseEngine::register()`.
4. Добавить тип команды/события в `engine.manifest.json`.
5. При необходимости расширить `IUniverseEntity` и добавить сущность в `Entities/`
   (рекурсивное сканирование папки `Entities` уже поддерживается).
