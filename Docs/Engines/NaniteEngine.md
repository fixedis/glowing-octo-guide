<!-- Docs/Engines/NaniteEngine.md -->

# Документация NaniteEngine (v0.1.0)

Домен-независимый модуль бюджетного арбитра детализации («нанит-ядро»).
Подключается через манифест `src/Engines/NaniteEngine/Config/engine.manifest.json`
и реализует `Project\CoreEngine\Contracts\RegistrableEngineInterface`.

Философия: сервер **НЕ считает графику** (треугольники, квадтри, геометрию).
Он считает только логический бюджет представления: веса тиров, активный тир,
бюджеты стриминга и симуляции. Любой движок может отдать тела как плоские
данные (`id, screenPx, baseRadius`) — предметная область для NaniteEngine неважна.

---

## 1. Ответственность движка

| Что делает | Что НЕ делает |
|---|---|
| Расчёт весов тиров (surface/billboard/point) | Треугольники / полигоны / геометрию |
| Выбор активного тира (максимальный вес) | Рендеринг (зона клиента) |
| Логические бюджеты стриминга и симуляции | Бой / экономику / сеть |
| Саморегуляцию бюджетов на тиках | Прямое изменение чужих сущностей |

---

## 2. Структура модуля

```text
src/Engines/NaniteEngine/
    NaniteEngine.php                       # класс движка
    Contracts/
        NaniteEntityInterface.php          # домен-независимый контракт тела
        TierStrategyInterface.php          # стратегия тира
    Core/
        Commands/EvaluateNaniteFrameHandler.php
        NaniteBudgetDirector.php           # ядро бюджета (не графика)
        NaniteBudgetRegulator.php          # тик-система саморегуляции
        NaniteEntityAdapter.php            # адаптер сырых данных к контракту
        NaniteEntityResult.php             # иммутабельный DTO результата
        NaniteTierSnapshot.php             # снапшот состояния тира
        Tiers/
            AbstractTierStrategy.php       # базовая smoothstep-логика
            SurfaceTierStrategy.php
            BillboardTierStrategy.php
            PointTierStrategy.php
    Config/
        engine.manifest.json
```

---

## 3. Контракты

### 3.1 `NaniteEntityInterface`
Единственная «валюта» нанит-ядра — три числа:
- `naniteEntityId(): string` — стабильный id (кэш/сигнатура).
- `naniteScreenPx(): int` — экранный размер тела в пикселях (≥ 0).
- `naniteBaseRadius(): int` — эталонный радиус тела в мировых единицах (> 0).

### 3.2 `TierStrategyInterface`
- `tierName(): string`
- `thresholdPx(int $baseRadius): int` — нижняя граница активности тира.
- `weight(int $screenPx, int $baseRadius): int` — непрерывный вес `[0, 1000]`.

---

## 4. Регистрация механизмов

`NaniteEngine::register()` собирает граф зависимостей внутри себя (как и
UniverseEngine — чтобы конструктор не тянул классы для авто-резолва):

```php
$tiers = [new SurfaceTierStrategy(), new BillboardTierStrategy(), new PointTierStrategy()];
$director = new NaniteBudgetDirector($tiers);

$registration->commandHandler('EvaluateNaniteFrame', new EvaluateNaniteFrameHandler($director));
$registration->system(new NaniteBudgetRegulator($services->state, $services->logger));
```

`boot()` / `shutdown()` — без побочных эффектов.

---

## 5. Команда `EvaluateNaniteFrame`

Payload:
- `entities: list<{id: string, screenPx: int, baseRadius: int}>` (обязательно, непустой)
- `focusId?: string` (опционально — тело с приоритетной симуляцией)

Поведение `EvaluateNaniteFrameHandler`:
1. Нормализация и валидация (`screenPx ≥ 0`, `baseRadius ≥ 1`).
2. Адаптация сырых данных в `NaniteEntityAdapter` (реализует интерфейс, не требуя
   правки сущностей домена).
3. `NaniteBudgetDirector::evaluate()` — расчёт результатов.
4. Вычисление `signature` (md5 по `id:screenPx:activeTier:simulated`).
5. Детект смены активного тира относительно предыдущего кадра → событие
   `NaniteTierChanged` на каждое изменившееся тело.
6. Запись в state: `nanite.signature`, `nanite.tiers`, `nanite.snapshot`,
   `nanite.stableFrames`.

События:
- `NaniteFrameEvaluated` — снапшот бюджета (results + занятые слоты + signature).
- `NaniteTierChanged` — `{entityId, from, to, screenPx}` (одно на смену тира).

---

## 6. NaniteBudgetDirector — ядро бюджета

Константы:
- `STREAMING_BUDGET = 256` — максимум одновременно «загруженных» тел.
- `SIMULATION_BUDGET = 64` — максимум тел с активной симуляцией за кадр.

Для каждого тела:
- `surface/billboard/point` веса через стратегии.
- `activeTier` = тир с максимальным весом (при равенстве приоритет
  surface > billboard > point).
- `streamed` = `screenPx > 0 && streamingUsed < STREAMING_BUDGET`.
- `simulated` = `id === focusId || (screenPx >= 120 && simulationUsed < SIMULATION_BUDGET)`.

Результат — `NaniteEntityResult` (immutable DTO, веса `[0, 1000]`).

---

## 7. Тиры (паттерн Strategy)

Наследуют `AbstractTierStrategy` (базовый smoothstep-рост в `[threshold, threshold+blend]`,
клиппинг в `[0, 1000]`). Порог нормализуется по радиусу:
`thresholdPx = THRESHOLD_PX * REFERENCE_RADIUS(1000) / baseRadius` —
больше тело → ниже порог (становится детальным раньше).

| Тир | THRESHOLD_PX | BLEND_PX | Поведение weight() |
|---|---|---|---|
| `SurfaceTierStrategy` | 120 | 60 | базовый рост; выше верхней границы удерживает 1000 (полная геометрия) |
| `BillboardTierStrategy` | 24 | 40 | пик на верхней границе, **спад к 0** выше `2*upper` (средний диапазон) |
| `PointTierStrategy` | 0 | 24 | **обратная логика**: максимум при `screenPx=0`, спад к 0 к `BLEND_PX` |

Веса в fixed-point `[0, 1000]` (масштаб 1/1000, как `MathKernel::DEFAULT_SCALE`).

---

## 8. NaniteBudgetRegulator — тик-система саморегуляции

`implements TickSystemInterface`. Читает `nanite.snapshot` из state, правит
бюджеты по occupancy (доля занятых слотов):

- `OCCUPANCY_HARD = 0.95` → поджимает оба бюджета на 15% (`* 0.85`).
- `OCCUPANCY_SOFT = 0.70` → аккуратно расширяет на 5%+1, но **не выше дефолта**
  (256 / 64).
- Пол `max(8, …)` для стриминга, `max(4, …)` для симуляции.

Пишет в state: `nanite.streamingBudget`, `nanite.simulationBudget`.

---

## 9. Ключи state, которые пишет движок

| Ключ | Тип | Кто пишет |
|---|---|---|
| `nanite.signature` | string (md5) | EvaluateNaniteFrameHandler |
| `nanite.tiers` | `array<id, tier>` | EvaluateNaniteFrameHandler |
| `nanite.snapshot` | array (results + slots + signature) | EvaluateNaniteFrameHandler |
| `nanite.stableFrames` | int | EvaluateNaniteFrameHandler |
| `nanite.streamingBudget` | int | NaniteBudgetRegulator |
| `nanite.simulationBudget` | int | NaniteBudgetRegulator |

---

## 10. Расширение движка

1. Новый тир — наследовать `AbstractTierStrategy`, задать `THRESHOLD_PX`/`BLEND_PX`,
   при необходимости переопределить `weight()`. Добавить в `defaultTiers()` в
   `NaniteEngine::register()`.
2. Новый домен-источник тел — реализовать `NaniteEntityInterface` ИЛИ отдавать
   сырые данные через команду (адаптер сделает остальное).
3. Новая логика бюджета — расширить `NaniteBudgetDirector` (он не знает предметной
   области, только `(screenPx, baseRadius)`).

---

## 11. Детерминизм

Движок не использует собственный RNG для расчёта кадра: веса тиров и бюджеты —
чистые функции от входных `screenPx/baseRadius`. Порядок тел в `entities` влияет
только на очерёдность расхода бюджетов стриминга/симуляции (детерминирован при
фиксированном порядке входа). См. «Замечания» (Docs/Engines/REMARKS.md) про
отсутствие использования `DeterministicRandomInterface`.
