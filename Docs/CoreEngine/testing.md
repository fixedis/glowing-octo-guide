<!-- Docs/CoreEngine/testing.md -->

# Тестирование CoreEngine

---

## Запуск тестов

Если Composer установлен и зависимости установлены:

```cmd
vendor\bin\phpunit
```

Если PHP не находится в PATH, можно использовать PHP из OSPanel:

```cmd
C:\OSPanel\modules\php\PHP_8.1\php.exe vendor\bin\phpunit
```

---

## Структура тестов

```text
tests/
    CoreEngine/
    Fixtures/
```

---

## CoreEngine тесты

Тесты ядра проверяют:

- Kernel;
- команды;
- события;
- тик-системы;
- Container;
- EngineFactory;
- EngineLoader;
- ManifestLoader;
- EngineDependencyResolver;
- EngineRegistration;
- EntityRegistry;
- EntityDiscovery;
- MathKernel;
- DeterministicRandom;
- SnapshotManager;
- CoreEngineBootstrap.

---

## Fixtures

Фикстуры находятся в:

```text
tests/Fixtures/
```

Они используются для проверки:

- загрузки движков;
- регистрируемых движков;
- сущностей;
- контейнера;
- автозагрузки.

---

## Правила тестирования

1. Каждый новый механизм ядра должен иметь тесты.
2. Каждый новый движок должен иметь тесты.
3. Каждая критичная числовая операция должна иметь тесты.
4. Тесты не должны зависеть от внешнего времени.
5. Тесты не должны зависеть от недетерминированного RNG.
6. Тесты не должны использовать реальную базу данных.
7. Тесты не должны использовать сеть.
8. Фикстуры должны быть минимальными.
9. Фикстуры не должны имитировать полноценные игровые движки.
10. Тесты должны быть воспроизводимыми.

---

## Что должно быть покрыто тестами в будущем

- реальный GraphicsEngine skeleton;
- интеграция движков через bootstrap (✅ EconomyEngine/NetworkEngine/AdminEngine уже покрыты);
- загрузка сущностей из реальных движков (✅ Universe/Nanite/Economy);
- восстановление состояния из снапшотов (✅ SnapshotManager + RuntimeStateStore);
- проверка детерминизма нескольких тиков;
- проверка порядка загрузки зависимых движков;
- проверка ошибок манифестов;
- проверка ошибок регистрации сущностей.
