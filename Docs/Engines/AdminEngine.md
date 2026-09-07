<!-- Docs/Engines/AdminEngine.md -->

# Документация AdminEngine (v0.1.0)

Серверный модуль администрирования. Подключается через манифест
`src/Engines/AdminEngine/Config/engine.manifest.json` и реализует
`Project\CoreEngine\Contracts\RegistrableEngineInterface`.

Философия: AdminEngine **не содержит игровой логики**. Он управляет флагами
(`godmode`, `session`), редактирует данные других движков через их состояние
(Economy/Nanite) и управляет снапшотами. Это «панель управления» поверх
существующих движков, а не новый домен.

---

## 1. Ответственность движка

| Что делает | Что НЕ делает |
|---|---|
| Серверную авторизацию (`AdminAuthenticate`) | Рендеринг UI (это клиент) |
| Переключение режима бога (`godmode`) | Генерацию вселенной напрямую |
| Редактирование экономики (`edit`/`grant`) | Бой / графику / сеть |
| Override бюджетов Nanite | Прямое изменение чужих сущностей в обход контрактов |
| Save/Load снапшотов | Хранение UI-состояния |

---

## 2. Структура модуля

```text
src/Engines/AdminEngine/
    AdminEngine.php                                  # класс движка
    Config/engine.manifest.json
    Core/Commands/
        AdminAuthenticateHandler.php                 # серверная auth (env ADMIN_TOKEN)
        AdminSetGodModeHandler.php                   # флаг admin.godmode
        AdminEditEconomyHandler.php                  # правка economy.colony.*
        AdminGrantResourcesHandler.php               # выдача ресурсов (обход добычи)
        AdminSetNaniteBudgetHandler.php              # override nanite.*Budget
        AdminSaveSnapshotHandler.php                 # SnapshotManager::persist
        AdminLoadSnapshotHandler.php                 # SnapshotManager::restoreIntoState
```

---

## 3. Команды

| Команда | Назначение | Ключ State / эффект |
|---|---|---|
| `AdminAuthenticate` | Сверить токен с `ADMIN_TOKEN`, проставить `admin.session` | `admin.session` |
| `AdminSetGodMode` | Вкл/выкл режим бога | `admin.godmode` |
| `AdminEditEconomy` | Правка `baseYield`/`efficiency` колонии | `economy.colony.{seed}` |
| `AdminGrantResources` | Добавить к `stored` колонии | `economy.colony.{seed}` |
| `AdminSetNaniteBudget` | Override бюджетов стриминга/симуляции | `nanite.streamingBudget`, `nanite.simulationBudget` |
| `AdminSaveSnapshot` | Сохранить текущий снапшот | через `SnapshotManager` |
| `AdminLoadSnapshot` | Восстановить State из снапшота по tick | через `SnapshotManager` |

> Спавн планет/кораблей (`SpawnPlanet`, `SpawnShip`) реализован в **UniverseEngine**
> (он владелец генерации), а не в AdminEngine. AdminEngine управляет только флагом
> `admin.godmode`, который эти хендлеры читают для ослабления валидации координат.

---

## 4. Режим бога (God Mode)

Серверное состояние (`state['admin.godmode']`), **не клиентский чекбокс**.
Влияет на хендлеры спавна в UniverseEngine (`SpawnPlanet`, `SpawnShip`):
при включённом godmode координаты не валидируются (можно спавнить вне рукавов).
Проверка происходит на сервере при исполнении команды — доверять клиенту нельзя.

---

## 5. Авторизация (двухуровневая)

1. **Транспорт** — `NetworkEngine` блокирует команды с префиксом `Admin`,
   если задан env `ADMIN_TOKEN` и не передан заголовок `X-Admin-Token`
   (см. `Docs/Engines/NetworkEngine.md`).
2. **Логика** — `AdminAuthenticateHandler` сравнивает токен с `expectedToken`
   (из того же env `ADMIN_TOKEN`, переданного при регистрации движка).

Без `ADMIN_TOKEN` (dev-режим) оба уровня открыты — любой токен проходит.

---

## 6. Детерминизм и replay

Admin-команды мутируют состояние вне основного потока симуляции, поэтому
ломают replay-детерминизм. Помечать их тегом `out-of-band`; `ReplayManager`
должен исключать их из записи или писать в отдельный журнал вне основного потока
(см. блок 2 roadmap). В текущей реализации команда помечается префиксом `Admin*`,
что достаточно для фильтрации на транспортном слое.

---

## 7. Известное ограничение: per-request runtime

Текущий `public/index.php` создаёт **новый рантайм на каждый HTTP-запрос**,
поэтому `admin.godmode` / `admin.session` и любые изменения State не переживают
между запросами в обычном режиме. AdminEngine полноценно работает:

- внутри одного рантайма — доказано тестами `AdminEngineTest` и скриптами проверки;
- либо при включении долгоживущего **runtime-daemon**, который держит единый
  `Kernel` между HTTP-запросами (следующий шаг, см. roadmap: «persistent runtime»).

Через HTTP админку имеет смысл использовать в связке с `AdminSaveSnapshot` /
`AdminLoadSnapshot` (снапшот переживает перезапуски рантайма).
