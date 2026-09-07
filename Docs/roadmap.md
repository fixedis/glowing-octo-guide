<!-- Docs/roadmap.md -->

# Roadmap развития проекта (CoreEngine + движки)

Согласованный план развития от инфраструктуры к доменным механикам.
Источник истины: архитектура `CoreEngine` (см. `Docs/CoreEngine/architecture.md`)
и правила `AI/rules.md`. Порядок обоснован зависимостями между слоями.

---

## 0. Инфраструктура — ВЫПОЛНЕНО ✅

- CoreEngine: тики, команды, события, снапшоты, реестры, DI, загрузка манифестов,
  детерминизм (FNV-1a + mulberry32, верифицирован PHP↔TS).
- UniverseEngine (v0.4.0): генерация вселенной.
- NaniteEngine (v0.1.0): бюджетный арбитр детализации.
- EconomyEngine (v0.1.0): базовая ресурсная экономика.
- FileSnapshotStore: персистентность снапшотов (env `SNAPSHOT_DIR`).
- ReplayManager: запись/воспроизведение + оракул детерминизма.
- Тесты: 184 PHPUnit + 86 Vitest, все зелёные.

---

## 1. Сетевой фасад и управление временем — ВЫПОЛНЕНО ✅

### 1.1 NetworkEngine (приоритет А) — реализован (v0.1.0)
**Цель:** убрать техдолг — HTTP/REST-слой, встроенный в `UniverseEngine/Presentation`.

Ответственность:
- Единый API-фасад `/api/v1/...` для всех движков (Universe, Nanite, Economy, будущий Admin).
- Серверная авторизация (токен/сессия) — обязательна до админки: «я админ» нельзя доверять клиенту.
- Маршрутизация внешних запросов на команды ядра через `CommandBus`.
- Вынос `UniverseRouter`/`HttpRequest`/`HttpResponse` из UniverseEngine в этот модуль.

Не делает: рендеринг, хранение UI-состояния, игровую логику.

### 1.2 Kernel time-control (приоритет Б)
**Цель:** управление циклом симуляции извне.

Добавить в ядро:
- `Kernel::pause()` / `resume()`;
- `Kernel::step()` — ровно один тик вручную;
- `Kernel::setSpeed(int $ticksPerSecond)` — скорость прокрутки.

Обоснование: база для админки (пауза/шаг/ускорение) и отладки. Маленькая,
самодостаточная фича ядра, не ломающая существующий `runTick()`.

---

## 2. Админка (серверный AdminEngine + клиентский слой) — ВЫПОЛНЕНО ✅ (серверная часть)

**Цель:** редактирование экономики, спавн планет/кораблей, просмотр, режим бога.

Реализовано:
- серверный `AdminEngine` (v0.1.0) — команды `AdminAuthenticate`, `AdminSetGodMode`,
  `AdminEditEconomy`, `AdminGrantResources`, `AdminSetNaniteBudget`, `AdminSaveSnapshot`,
  `AdminLoadSnapshot`. Флаги `admin.session` / `admin.godmode` живут в State (серверное состояние).
- спавн вынесен в `UniverseEngine` (`SpawnPlanet`, `SpawnShip`) — читает флаг `admin.godmode`
  и при godmode пропускает валидацию координат. AdminEngine не трогает генерацию напрямую.
- транспортная авторизация в `NetworkEngine` (заголовок `X-Admin-Token` при заданном `ADMIN_TOKEN`).

Клиентский UI (`client/src/admin/`) — отдельный слой, НЕ реализован (см. блок 4).

Новые команды:
```text
AdminAuthenticate     { token }                 -> admin.session
AdminSetGodMode       { enabled }               -> state['admin.godmode']
AdminEditEconomy      { planetSeed, baseYield, efficiency }   (правка economy.colony.*)
AdminGrantResources   { planetSeed, amount }                    (обход добычи)
AdminSetNaniteBudget  { streaming, simulation }                (override nanite.*Budget)
AdminSaveSnapshot / AdminLoadSnapshot { tick }                 (SnapshotManager)
SpawnPlanet / SpawnShip  -> в UniverseEngine, god = skip validation
```

Режим бога — **серверное состояние**, не клиентский чекбокс.

**Детерминизм:** admin-действия ломают replay. Помечены префиксом `Admin*` (фильтруются
на транспорте); `ReplayManager` должен исключать их из основного потока (см. блок 1 roadmap).

**Ограничение per-request runtime:** решено в блоке 4 (Persistent runtime) — состояние
переживает между HTTP-запросами через `RuntimeStateStore`. До этого AdminEngine был
проверен внутри единого рантайма (тесты `AdminEngineTest`, скрипты проверки).

---

## 2.1 Persistent runtime (история решения)

**Проблема:** `php -S` + per-request `index.php` убивает State между запросами.

**Решение (выбран вариант 2):** rolling-state через файл (`RuntimeStateStore`).
Варианты рассматривались:
1. `apcu`/`shm` кеш рантайма (быстро,但 общий State на все воркеры, нет тик-цикла).
2. ✅ Автовосстановление State из `RuntimeStateStore` на каждом запросе + сохранение
   после каждой команды (реализовано, см. блок 4).
3. Фоновый tick-worker (ReactPHP / `pcntl` fork) — отложен на прод-нагрузку.

---

## 3. Доменные движки — порядок по зависимостям

Каждый домен = отдельный движок (правило `rules.md`: не смешивать). Бой — финал
цепочки, не делать рано.

| № | Движок | Ответственность | Зависит от |
|---|---|---|---|
| ✅ | EconomyEngine (v0.1.0) | регистрация колоний, добыча, сбор | — |
| ✅ | ProductionEngine (v0.1.0) | превращение ресурсов в постройки/юниты | Economy |
| ✅ | FleetEngine (v0.1.0) | флоты из юнитов, перемещение, десант | Universe (координаты), Economy, Production |
| ✅ | CombatEngine (v0.1.0) | детерминированный бой флотов, потери, боеприпасы | Fleet, Economy, MathKernel |
| 5 | ResearchEngine / TechEngine | модификаторы (бонусы/штрафы) через события | Economy (затраты) |
| 6 | DiplomacyEngine / AIEngine | отношения, поведение NPC | Fleet, Combat |

**Критерий готовности нового доменного движка:**
1. есть инфраструктура (✅);
2. есть фасад + time-control (✅ NetworkEngine + Kernel time-control);
3. у движка чёткая ответственность, не пересекающаяся с существующими;
4. он общается через команды/события, не трогая чужое состояние напрямую.

Если выполнено — создавать. Economy прошёл, Production — следующий логичный.

---

## 5. UI / Админка (клиентский слой) — последний слой

Клиент уже рисует сцену и шлёт команды. Серверный «UI Engine» как отдельный
модуль — не нужен (это клиентская зона по `rules.md` и `architecture.md`).
Админка = привилегированный диспетчер команд + читатель снапшотов поверх
NetworkEngine + AdminEngine + persistent runtime.

Серверная часть админки реализована (блок 2). Клиентский UI (`client/src/admin/`)
остаётся следующим шагом после доменных движков (или параллельно).

---

## 4. Persistent runtime (dolgozhivushchiy runtime) — VYPOLNENO ✅

**Цель:** решить проблему per-request `php -S` — состояние (tick, админ-флаги,
экономика) переживает между HTTP-запросами.

Реализовано (вариант 2 из блока 2.1 — rolling-state через файл):
- `RuntimeStateStore` — rolling-хранилище живого state (`runtime_state.json`),
  атомарная запись. Директория = `SNAPSHOT_DIR` или `sys_get_temp_dir()/coreengine_rt`.
- `Kernel::restoreFromState(int $tick, array $state)` — восстановление без
  перезапуска движков (RNG синхронизируется через `setTick`).
- `CoreServices::$kernel` — Kernel доступен роутеру для kernel-control.
- `NetworkEngine` получил эндпоинты `/kernel/status|pause|resume|step`
  (admin-only) + `GET /state` без `key` (весь State, admin-only).
- `index.php` поддерживает persistent-режим: флаг из env `PERSISTENT_RUNTIME`
  ИЛИ из файла-маркера `public/.persistent-runtime` (т.к. `php -S` не наследует
  env в обработчике запроса).

Проверено: через `php -S` godmode + tick переживают между запросами
(запись в `runtime_state.json`, восстановление в следующем запросе).

Документация: `Docs/Engines/persistent-runtime.md`.

> Полноценный tick-worker (вариант 3) — отдельный шаг, когда перейдём к
> прод-нагрузке. Текущий режим достаточен для dev-админки и отладки.

---

## Итоговая последовательность

1. ✅ NetworkEngine (фасад + auth) — разблокировал всё остальное.
2. ✅ Kernel time-control (пауза/шаг/скорость).
3. ✅ AdminEngine (поверх NetworkEngine) — серверная часть: редактор, спавн, god mode, снапшоты.
4. ✅ Persistent runtime — rolling-state между HTTP-запросами (вариант 2).
5. ✅ ProductionEngine (v0.1.0) — первая игровая механика поверх экономики.
6. ✅ FleetEngine (v0.1.0) — флоты, перемещение, десант (цепочка Economy→Production→Fleet).
7. ✅ CombatEngine (v0.1.0) — детерминированный бой флотов (цепочка →Combat).
8. ResearchEngine — модификаторы на всё выше.
9. Клиентская админка (UI) — поверх NetworkEngine + AdminEngine + persistent runtime.

Механики и экономика уместны уже сейчас (Economy есть, Production — следующий логичный).
Бои — после флота и экономики. Клиентская админка (UI) — когда есть фасад и контроль времени.
