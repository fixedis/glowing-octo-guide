<!-- Docs/CoreEngine/module-guide.md -->

# Руководство по созданию подключаемого движка

Этот документ описывает, как создавать движки для CoreEngine.

---

## Базовая структура движка

Пример:

```text
Engines/GraphicsEngine/
    Core/
        GraphicsEngine.php
    Contracts/
        IRenderEntity.php
    Entities/
        Stars/
        Planets/
        Ships/
    Bridge/
    Config/
        engine.manifest.json
```

---

## Обязательные части движка

### 1. Класс движка

Класс должен реализовать:

```text
Project\CoreEngine\Contracts\EngineInterface
```

или:

```text
Project\CoreEngine\Contracts\RegistrableEngineInterface
```

---

### 2. Манифест

Файл:

```text
Config/engine.manifest.json
```

---

### 3. Сущности

Если у движка есть сущности, они должны находиться в отдельной папке, например:

```text
Entities/
```

и реализовывать интерфейс, указанный в манифесте.

---

## Пример манифеста

```json
{
    "id": "graphics-engine",
    "name": "Graphics Engine",
    "version": "0.1.0",
    "apiVersion": "1.0.0",
    "engineClass": "Project\\Engines\\GraphicsEngine\\Core\\GraphicsEngine",
    "requires": [
        "core.state",
        "core.events"
    ],
    "provides": [
        "graphics.render",
        "graphics.scene"
    ],
    "commands": [],
    "events": [],
    "entities": {
        "path": "Entities",
        "interface": "Project\\Engines\\GraphicsEngine\\Contracts\\IRenderEntity",
        "autoload": true
    }
}
```

---

## Пример класса движка

```php
<?php

declare(strict_types=1);

namespace Project\Engines\GraphicsEngine\Core;

use Project\CoreEngine\Contracts\RegistrableEngineInterface;
use Project\CoreEngine\Core\CoreServices;
use Project\CoreEngine\Core\EngineRegistration;

final class GraphicsEngine implements RegistrableEngineInterface
{
    public function id(): string
    {
        return 'graphics-engine';
    }

    public function version(): string
    {
        return '0.1.0';
    }

    public function register(
        EngineRegistration $registration,
        CoreServices $services
    ): void {
        // Регистрация команд, событий и систем.
    }

    public function boot(): void
    {
        // Запуск движка.
    }

    public function shutdown(): void
    {
        // Остановка движка.
    }
}
```

---

## Регистрация обработчика команд

Внутри `register()`:

```php
$registration->commandHandler('SomeCommand', new SomeCommandHandler());
```

---

## Регистрация обработчика событий

Внутри `register()`:

```php
$registration->eventHandler('SomeEvent', new SomeEventHandler());
```

---

## Регистрация тик-системы

Внутри `register()`:

```php
$registration->system(new SomeTickSystem());
```

---

## Требования к сущностям

Если манифест содержит:

```json
"entities": {
    "path": "Entities",
    "interface": "Project\\Engines\\GraphicsEngine\\Contracts\\IRenderEntity",
    "autoload": true
}
```

то:

1. Папка `Entities` должна существовать внутри движка.
2. Все автоматические сущности должны быть классами.
3. Все автоматические сущности должны реализовывать указанный интерфейс.
4. Абстрактные классы и интерфейсы пропускаются.
5. Классы должны корректно загружаться через Composer autoload.

---

## Как CoreEngine выводит namespace сущностей

Если класс движка:

```text
Project\Engines\GraphicsEngine\Core\GraphicsEngine
```

и папка сущностей:

```text
Entities
```

то namespace сущностей будет:

```text
Project\Engines\GraphicsEngine\Entities
```

Файл:

```text
Entities/Ships/ShipVisual.php
```

ожидает класс:

```text
Project\Engines\GraphicsEngine\Entities\Ships\ShipVisual
```

---

## Правила для движков

1. Движок не должен менять чужие движки напрямую.
2. Движок не должен хранить игровые домены других движков.
3. Движок должен использовать `EngineRegistration` для регистрации механизмов.
4. Движок должен использовать `CoreServices` для доступа к сервисам ядра.
5. Движок не должен создавать собственные механизмы случайных чисел (кроме случаев обоснованной синхронизации с клиентом, см. `AI/rules.md` §Числа).
6. Движок не должен использовать `rand()` или `mt_rand()`.
7. Движок использует детерминированный RNG; собственный RNG допустим только при обоснованной синхронизации с клиентом (см. `AI/rules.md` §Числа).
8. Движок не должен использовать float для критичной симуляции.
9. Движок должен использовать `MathKernelInterface` для числовых расчётов.
10. Движок не должен напрямую обращаться к базе данных или сети.

---

## Проверка движка

Перед подключением движок должен быть проверен:

1. Манифест валиден.
2. Класс движка существует.
3. Класс реализует `EngineInterface`.
4. Зависимости `requires` доступны.
5. `provides` не конфликтуют с другими движками.
6. Сущности существуют.
7. Сущности реализуют требуемый интерфейс.
8. Тесты движка проходят.
