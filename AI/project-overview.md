<!-- AI/project-overview.md -->

# Обзор проекта

Проект представляет собой модульный игровой движок-оркестратор.

Основная часть — `CoreEngine`.

Он уже реализует:

- тики;
- состояние;
- команды;
- события;
- снапшоты;
- реестр движков;
- реестр сущностей;
- загрузку манифестов;
- проверку зависимостей движков;
- DI-контейнер;
- математическое ядро;
- детерминированный RNG;
- bootstrap;
- тесты.

---

## Текущий статус

CoreEngine является рабочим фундаментом.

Реализованы пять реальных подключаемых движков:

```text
UniverseEngine (v0.4.0)  — генерация вселенной (галактики, системы, планеты, колонии)
NaniteEngine   (v0.1.0)  — бюджетный арбитр детализации (тиры surface/billboard/point, стриминг/симуляция)
EconomyEngine  (v0.1.0)  — ресурсная экономика (регистрация колоний, добыча, сбор)
NetworkEngine  (v0.1.0)  — сетевой фасад (универсальный API + серверная авторизация), закрыл техдолг HTTP-слоя
AdminEngine      (v0.1.0)  — серверный модуль администрирования (godmode, auth, правка экономики, override бюджетов Nanite, save/load снапшотов); поверх NetworkEngine
```

Ещё не созданы (планируются):

```text
GraphicsEngine — не создан
UIEngine — не создан (роль UI исполняет Vite/TS-клиент)
AudioEngine — не создан
```

Важное ограничение (runtime): текущий `public/index.php` по умолчанию создаёт
**новый рантайм на каждый HTTP-запрос** (per-request). Включение **persistent runtime**
(файл-маркер `public/.persistent-runtime` или env `PERSISTENT_RUNTIME=1`) заставляет
ядро восстанавливать состояние из `RuntimeStateStore` между запросами — админка,
godmode-флаги и накопленная симуляция переживают запросы. Тик-цикл при этом не
крутится сам (нужен `POST /kernel/step` или tick-worker для автопрокрутки).

Админка полноценно работает:
- внутри одного рантайма (тесты `AdminEngineTest`, скрипты проверки);
- либо в persistent-режиме (см. `Docs/Engines/persistent-runtime.md`);
- либо при включении долгоживущего runtime-daemon (вариант 3 из roadmap блока 2.1).

Ядро также получило управление временем симуляции: `pause/resume/step/setSpeed`
(Kernel time-control) для отладки и админки. Добавлен **persistent runtime**:
через `RuntimeStateStore` + `Kernel::restoreFromState` состояние (tick, админ-флаги,
экономика) переживает между HTTP-запросами (см. `Docs/Engines/persistent-runtime.md`).

---

## Следующая цель

Расширение реализованных движков и создание недостающих модулей по правилам CoreEngine.

Выполнено (см. `Docs/roadmap.md`):

```text
✅ NetworkEngine        — вынос HTTP/REST-слоя из UniverseEngine/Presentation
✅ Kernel time-control  — pause/resume/step/setSpeed
✅ AdminEngine          — серверная админка (godmode, auth, правка экономики, снапшоты)
✅ Persistent runtime   — состояние переживает HTTP-запросы (RuntimeStateStore)
```

Приоритет следующих шагов:

```text
1. ProductionEngine — первая игровая механика поверх EconomyEngine
2. FleetEngine → CombatEngine — когда появится что воевать
3. ResearchEngine — модификаторы через события
4. Клиентская админка (UI) — поверх NetworkEngine + AdminEngine
5. Углубление UniverseEngine / NaniteEngine (документация, тесты интеграции)
```

---

## Ключевые директории

```text
src/CoreEngine/Contracts
src/CoreEngine/Core
src/Engines/UniverseEngine
src/Engines/NaniteEngine
client/                     (Vite + TypeScript фронтенд, three.js — зона UI/визуализации)
tests/CoreEngine
tests/Engines
tests/Fixtures
Docs/CoreEngine
Docs/Engines
AI
```

---

## Важные файлы

```text
src/CoreEngine/Core/Kernel.php
src/CoreEngine/Core/CoreServices.php
src/CoreEngine/Core/CoreEngineBootstrap.php
src/CoreEngine/Core/EngineLoader.php
src/CoreEngine/Core/EngineDependencyResolver.php
src/CoreEngine/Core/EntityDiscovery.php
src/CoreEngine/Core/EntityRegistry.php
src/CoreEngine/Core/MathKernel.php
src/CoreEngine/Core/DeterministicRandom.php
src/CoreEngine/Core/SnapshotManager.php
```

---

## Технологический стек

```text
PHP 8.1
PHPUnit
Composer PSR-4
strict_types
```
