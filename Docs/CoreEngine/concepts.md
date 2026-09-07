<!-- Docs/CoreEngine/concepts.md -->

# Основные концепции CoreEngine

---

## Tick

Tick — это единица игрового времени.

Каждый вызов `Kernel.runTick()` выполняет один полный цикл:

- обработка команд;
- выполнение систем;
- публикация событий;
- создание снапшота.

Tick должен быть детерминированным.

---

## State

State — это текущее состояние ядра.

Он хранит данные в виде ключ-значение.

Примеры:

```text
tick
seed
flags
temporary runtime markers
engine registration markers
```

State не является базой данных.
Он является оперативным состоянием симуляции.

---

## Command

Command — это намерение изменить состояние.

Структура:

```text
id
type
payload
actorId
targetId
version
```

Команда не меняет состояние напрямую.
Она передаётся в `CommandBus`, где для неё должен быть зарегистрирован обработчик.

---

## CommandResult

Результат выполнения команды.

Может быть:

```text
success
fail
```

Также может содержать события, которые нужно опубликовать после успешного выполнения.

---

## Event

Event — это факт, который уже произошёл.

Примеры:

```text
TickStarted
TickEnded
CommandRejected
SystemExecuted
```

События используются для реакции движков, логирования, отладки и будущих интеграций.

---

## Snapshot

Snapshot — это снимок состояния на конкретный тик.

Содержит:

```text
tick
state
hash
```

Snapshot используется для:

- проверки целостности;
- восстановления состояния;
- будущих сохранений;
- будущих реплеев;
- будущей сетевой синхронизации.

---

## Engine

Engine — это подключаемый движок.

Минимальный контракт:

```text
id()
version()
boot()
shutdown()
```

Если движок хочет регистрировать механизмы в ядре, он реализует:

```text
RegistrableEngineInterface
```

---

## RegistrableEngineInterface

Расширенный контракт движка.

Позволяет движку зарегистрировать:

- обработчики команд;
- обработчики событий;
- тик-системы.

При регистрации движок получает:

```text
EngineRegistration
CoreServices
```

---

## EngineRegistration

Объект регистрации механизмов от имени конкретного движка.

Позволяет:

```text
commandHandler(...)
eventHandler(...)
system(...)
```

Также хранит список зарегистрированных типов для диагностики.

---

## EngineManifest

Описание движка в JSON.

Содержит:

```text
id
name
version
apiVersion
engineClass
requires
provides
commands
events
entities
bridge
basePath
```

---

## EntityDiscovery

Механизм поиска сущностей движка.

Читает секцию `entities` из манифеста.

Ожидает:

```text
path
interface
autoload
```

Сейчас namespace сущностей выводится из namespace класса движка и имени папки.

---

## EntityRegistry

Реестр классов сущностей по движкам.

Хранит:

```text
engineId → list of entity classes
```

Не создаёт экземпляры сущностей автоматически.
Он регистрирует типы, которыми потом могут пользоваться движки.

---

## CoreServices

Агрегатор сервисов ядра.

Содержит:

```text
state
eventBus
commandBus
systemPipeline
engineRegistry
entityRegistry
container
math
random
snapshots
logger
```

Передаётся движкам при регистрации.

---

## Container

DI-контейнер.

Умеет:

- хранить готовые инстансы;
- хранить фабрики;
- автоматически разрешать зависимости через Reflection;
- защищаться от циклических зависимостей.

---

## EngineDependencyResolver

Проверяет зависимости движков.

Использует:

```text
requires
provides
```

Проверяет:

- отсутствие недостающих зависимостей;
- отсутствие конфликтов `provides`;
- отсутствие циклических зависимостей;
- порядок загрузки движков.

---

## SnapshotManager

Сервис снапшотов.

Умеет:

- создавать снапшот из состояния;
- считать hash;
- сохранять снапшот;
- искать снапшот по тику;
- восстанавливать состояние;
- проверять hash.

---

## MathKernel

Низкоуровневая числовая инфраструктура.

Не содержит игровых доменов.

Отвечает за:

- integer arithmetic;
- fixed point;
- safe overflow checks;
- division with scale;
- rounding modes;
- clamp;
- float-to-fixed conversion;
- fixed-to-float conversion.

---

## DeterministicRandom

Детерминированный генератор случайных чисел.

Использует:

```text
seed
scope
tick
counter
```

Генерация основана на SHA-256.

Предназначен для повторяемых игровых механик.

---

## Kernel

Главный исполнитель тиков.

Отвечает за:

- очередь команд;
- запуск тиков;
- синхронизацию RNG;
- выполнение систем;
- публикацию событий;
- создание и сохранение снапшотов.
