<!-- Docs/Engines/persistent-runtime.md -->

# Документация Persistent Runtime (v0.1.0)

Долгоживущий рантайм CoreEngine поверх per-request модели `php -S`.
Решает проблему: при обычном `public/index.php` каждый HTTP-запрос создаёт
**новый рантайм**, поэтому флаги админки (`admin.godmode`, `admin.session`),
накопленное состояние экономики и тик симуляции НЕ переживают между запросами.

Persistent runtime позволяет админке, Kernel time-control и накопительной
симуляции работать через HTTP: состояние (tick + State) сохраняется после
каждого запроса и восстанавливается в начале следующего.

---

## 1. Как включить

### Через файл-маркер (для `php -S`, рекомендуется)
```bash
touch public/.persistent-runtime
php -S localhost:8080 -t public public/index.php
```
`php -S` **не наследует env-переменные** в дочернем обработчике запроса,
поэтому флаг persistent читается и из файла-маркера `public/.persistent-runtime`.

### Через env (для CLI-демона / прод-режима)
```bash
PERSISTENT_RUNTIME=1 SNAPSHOT_DIR=/path/to/store php -S localhost:8080 -t public public/index.php
```
В демоне (долгоживущий процесс) env наследуется корректно.

---

## 2. Компоненты

| Класс | Назначение |
|---|---|
| `RuntimeStateStore` | Rolling-хранилище живого state (один файл `runtime_state.json`). Атомарная запись (temp + rename). |
| `Kernel::restoreFromState(int $tick, array $state)` | Восстановление тика + State + RNG без перезапуска движков. |
| `CoreServices::$kernel` | Доступ к Kernel из NetworkEngine (kernel-control маршруты). |
| `index.php` | Логика: `loadState` → `restoreFromState` → `handle` → `saveState`. |

Хранилище выбирается так же, как `SnapshotStore`:
- `SNAPSHOT_DIR` задан → `runtime_state.json` пишется туда;
- иначе → `sys_get_temp_dir()/coreengine_rt/runtime_state.json` (fallback).

---

## 3. Эндпоинты Kernel control (NetworkEngine)

Все требуют admin-авторизации (`X-Admin-Token`, если задан `ADMIN_TOKEN`),
кроме `GET /kernel/status` (открыт для чтения).

| Метод | Путь | Эффект |
|---|---|---|
| GET | `/api/v1/kernel/status` | `{tick, paused, speed}` |
| POST | `/api/v1/kernel/pause` | `kernel->pause()` |
| POST | `/api/v1/kernel/resume` | `kernel->resume()` |
| POST | `/api/v1/kernel/step` | `kernel->step()` (один тик вручную) |

Также `GET /api/v1/state` без `key` (только admin) возвращает **весь State**
для просмотра в админке.

---

## 4. Чтение всего State (admin)

`GET /api/v1/state` без параметра `key` возвращает `{"all": {...}}` —
только для администратора (требует `X-Admin-Token`). Чтение конкретного ключа
доступно без токена (read-only, как и раньше).

---

## 5. Детерминизм

Persistent runtime НЕ ломает детерминизм: `restoreFromState` восстанавливает
RNG через `DeterministicRandom::setTick($tick)`, поэтому последующие тики
дают те же значения, что и в непрерывном рантайме. Admin-команды по-прежнему
помечены префиксом `Admin*` и исключаются из replay-потока (см. `Docs/roadmap.md`).

---

## 6. Известные ограничения

- `php -S` + per-request: state переживает запросы через файл, но **тик-цикл
  не крутится сам** — нужен `POST /kernel/step` (или внешний tick-worker).
- Для прод-нагрузки рекомендуется полноценный демон (ReactPHP / `pcntl` fork),
  который держит Kernel в памяти и крутит `runTick()` по таймеру (вариант 3
  из roadmap блока 2.1). Текущая реализация — честный persistence-режим
  (вариант 2), достаточный для dev-админки и отладки.
