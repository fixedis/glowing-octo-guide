<!-- Docs/CoreEngine/architecture.md -->

# Архитектура CoreEngine

CoreEngine — это модульное ядро игрового движка-оркестратора.

Он не является движком графики, экономики, сети, UI или боя.
Его задача — предоставить общую инфраструктуру для специализированных движков.

---

## Основная идея

```text
CoreEngine подключает движки.
Движки подключают свои сущности.
Сущности не изменяют ядра движков.
Вся игровая доменная логика находится в подключаемых движках.
```

---

## Уровни ответственности

### CoreEngine отвечает за:

- тики;
- состояние;
- команды;
- события;
- снапшоты;
- реестр движков;
- реестр сущностей;
- загрузку манифестов;
- зависимости движков;
- детерминированную математику;
- детерминированный RNG;
- контейнер и DI;
- bootstrap и запуск ядра.

### CoreEngine не отвечает за:

- конкретные ресурсы;
- конкретные характеристики;
- экономику;
- бой;
- графику;
- звук;
- UI;
- сетевой протокол;
- конкретные игровые объекты.

---

## Высокоуровневая схема

```text
CoreEngineBootstrap
        ↓
Container / DI
        ↓
CoreServices
        ↓
EngineLoader
        ↓
ManifestLoader
        ↓
EngineDependencyResolver
        ↓
EngineFactory
        ↓
EntityDiscovery
        ↓
EngineRegistration
        ↓
EngineRegistry
        ↓
Kernel
        ↓
Tick loop
```

---

## Жизненный цикл запуска

1. `CoreEngineBootstrap` получает путь к движкам и seed.
2. Создаётся `Container`.
3. Регистрируются базовые сервисы:
   - Logger;
   - State;
   - EventBus;
   - CommandBus;
   - SystemPipeline;
   - EngineRegistry;
   - EntityRegistry;
   - MathKernel;
   - DeterministicRandom;
   - SnapshotManager.
4. Создаются `CoreServices`.
5. Создаётся `Kernel`.
6. Создаётся `EngineLoader`.
7. `EngineLoader` читает манифесты движков.
8. `EngineDependencyResolver` проверяет `requires` и `provides`.
9. `EngineFactory` создаёт движки.
10. `EntityDiscovery` находит сущности движков.
11. `EntityRegistry` регистрирует сущности.
12. Если движок реализует `RegistrableEngineInterface`, вызывается его `register()`.
13. Движок регистрируется в `EngineRegistry`.
14. `Kernel.boot()` запускает все движки.
15. Ядро готово выполнять тики.

---

## Жизненный цикл тика

```text
runTick()
    ↓
инкремент тика
    ↓
state["tick"] = currentTick
    ↓
random.setTick(currentTick)
    ↓
TickStarted event
    ↓
обработка очереди команд
    ↓
команды выполняются через CommandBus
    ↓
неудачные команды публикуют CommandRejected
    ↓
создаётся TickContext
    ↓
SystemPipeline выполняет тик-системы
    ↓
TickEnded event
    ↓
SnapshotManager создаёт снапшот
    ↓
SnapshotManager сохраняет снапшот
    ↓
Kernel возвращает Snapshot
```

---

## Ключевые правила архитектуры

1. CoreEngine не содержит игровую доменную логику.
2. Движки не должны напрямую вызывать друг друга.
3. Взаимодействие движков происходит через:
   - команды;
   - события;
   - состояние;
   - снапшоты;
   - контракты.
4. Сущности движков отделены от ядер движков.
5. Новые сущности должны добавляться без изменения ядра движка.
6. Все зависимости движков описываются в манифестах.
7. Числовая инфраструктура находится в CoreEngine.
8. Конкретные числовые домены находятся в движках.
9. Графика, UI, звук и сеть являются подключаемыми модулями.
10. Источник истины — состояние после тика.

---

## Текущие ограничения

- `EntityDiscovery` ожидает, что папка сущностей находится в namespace движка.
- Поле `path` в манифесте — одноуровневое (без `/`). При этом папка сканируется **рекурсивно**, поэтому иерархия внутри (например `Entities/Planets/Planet.php`) поддерживается.
- `InMemorySnapshotStore` хранит снапшоты только в памяти.
- Нет файловых, сетевых и банковских адаптеров сохранения.
- Реализованы движки `UniverseEngine` (v0.4.0), `NaniteEngine` (v0.1.0), `EconomyEngine` (v0.1.0), `NetworkEngine` (v0.1.0), `AdminEngine` (v0.1.0), `ProductionEngine` (v0.1.0), `FleetEngine` (v0.1.0) и `CombatEngine` (v0.1.0). Ещё не созданы GraphicsEngine, UIEngine, AudioEngine, ResearchEngine.
- Командные обработчики пока не получают прямой доступ к RNG через аргументы.
- Манифесты описывают команды и события как метаданные, но не валидируют их схемы автоматически.
- HTTP/REST-слой вынесен из `UniverseEngine/Presentation` в отдельный `NetworkEngine` (универсальный фасад `/api/v1/*` + серверная авторизация admin-команд). Техдолг закрыт.
- Снапшоты: реализован `FileSnapshotStore` (выбор через env `SNAPSHOT_DIR`); по умолчанию — `InMemorySnapshotStore`.
- Replay: реализован `ReplayManager` (запись/воспроизведение сессии + оракул детерминизма по хэшам снапшотов).
- Kernel: добавлено управление временем (`pause`/`resume`/`step`/`setSpeed`/`isPaused`/`getSpeed`) и восстановление состояния (`restoreFromState`).
- `CoreServices` расширен полем `kernel` (доступен роутеру NetworkEngine для kernel-control эндпоинтов).
- Добавлен `RuntimeStateStore` — rolling-хранилище живого состояния для долгоживущего рантайма.

---

## Будущие расширения

- GraphicsEngine;
- UIEngine;
- AudioEngine;
- PersistenceAdapter (базовый `FileSnapshotStore` уже реализован; rolling `RuntimeStateStore` для persistent runtime тоже);
- SchemaValidator для команд и событий;
- расширенный EntityRegistry с фабриками сущностей;
- поддержка явного namespace для сущностей;
- система приоритетов тик-систем;
- система отката и восстановления состояния.
