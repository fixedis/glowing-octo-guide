<!-- Docs/Engines/EconomyEngine.md -->

# Документация EconomyEngine (v0.1.0)

Доменный движок ресурсной экономики. Подключается через манифест
`src/Engines/EconomyEngine/Config/engine.manifest.json` и реализует
`Project\CoreEngine\Contracts\RegistrableEngineInterface`.

Философия: движок владеет **только экономическими данными** (регистрация
колоний, добыча, запасы). Он не знает про генерацию вселенной — колония
входит в экономику через команду `RegisterColonyEconomy`, которую может
отправить любой внешний модуль или клиент. Все расчёты ведутся в
fixed-point через `MathKernelInterface` (масштаб `1_000_000`).

---

## 1. Ответственность движка

| Что делает | Что НЕ делает |
|---|---|
| Регистрацию колоний в экономике | Генерацию вселенной / планет |
| Начисление дохода на тиках | Бой / графику / сеть |
| Снятие накопленных ресурсов (collect) | Прямое изменение чужих сущностей |
| Хранение запасов в State | Валидацию схем команд извне |

---

## 2. Структура модуля

```text
src/Engines/EconomyEngine/
    EconomyEngine.php                              # класс движка
    Contracts/
        IEconomyEntity.php                          # контракт сущности
    Entities/
        ColonyEconomy.php                           # доменная сущность (blueprint)
    Core/
        Commands/
            RegisterColonyEconomyHandler.php        # регистрация колонии
            CollectResourcesHandler.php             # сбор ресурсов
        Systems/
            EconomyTickSystem.php                   # начисление дохода
```

---

## 3. Манифест

```json
{
    "id": "economy-engine",
    "name": "Economy Engine",
    "version": "0.1.0",
    "apiVersion": "1.0.0",
    "engineClass": "Project\\Engines\\EconomyEngine\\EconomyEngine",
    "requires": ["core.engine", "core.state", "core.commands", "core.events"],
    "provides": ["economy.resources", "economy.production"],
    "commands": ["RegisterColonyEconomy", "CollectResources"],
    "events": ["ColonyEconomyRegistered", "ResourcesProduced", "ResourcesCollected"],
    "entities": {
        "path": "Entities",
        "interface": "Project\\Engines\\EconomyEngine\\Contracts\\IEconomyEntity",
        "autoload": true
    }
}
```

---

## 4. Команды

### RegisterColonyEconomy
Регистрирует колонию в экономике. Идемпотентна (повторная регистрация
возвращает успех с флагом `already`).

Пayload:
- `planetSeed` (int, >0) — ключ колонии;
- `baseYield` (int, fixed-point, ≥0) — базовый выход ресурсов за тик.

Событие: `ColonyEconomyRegistered { planetSeed, baseYield }`.

### CollectResources
Переводит накопленный доход колонии в общий пул `economy.collected`.
Обнуляет `stored`. Если `stored <= 0` — отказ.

Payload:
- `planetSeed` (int, >0).

Событие: `ResourcesCollected { planetSeed, amount, total }`.

---

## 5. Тик-система

`EconomyTickSystem` (имя `economy-tick-system`) на каждом тике проходит
по ключам состояния `economy.colony.*` и начисляет доход:

```
income = baseYield × efficiency   (fixed-point)
stored += income
```

`efficiency` по умолчанию `1_000_000` (1.0). Поле зарезервировано под
будущие модификаторы (бонусы/штрафы от других движков через события).

Событие: `ResourcesProduced { tick }`.

---

## 6. Модель данных в State

```text
economy.colony.{planetSeed} = {
    planetSeed: int,
    baseYield:  int,     # fixed-point
    stored:     int,     # накоплено, fixed-point
    efficiency: int      # 1_000_000 == 1.0
}
economy.collected = int  # суммарно собранный пул, fixed-point
```

---

## 7. Взаимодействие с другими движками

- **UniverseEngine** — не вызывается напрямую. Если UniverseEngine хочет
  подключить колонию к экономике, он шлёт команду `RegisterColonyEconomy`
  через `CommandBus` (связь только через ядро, по правилам архитектуры).
- **Ядро** — движок использует `MathKernelInterface` для всех числовых
  расчётов (нигде не использует float для критичной симуляции).

---

## 8. Покрытие тестами

`tests/Engines/EconomyEngine/EconomyEngineTest.php`:
- загрузка движка в bootstrap;
- регистрация + начисление дохода (5 тиков × 0.5 = 2.5M);
- валидация payload;
- сбор в общий пул и обнуление `stored`;
- защита от сбора без регистрации;
- защита от двойного сбора.
