<!-- AI/context-index.md -->

# Индекс контекста для AI

Этот файл описывает, какие документы и файлы нужно учитывать при работе с проектом.

---

## Обязательные документы

```text
AI/system-prompt.md
AI/project-overview.md
AI/glossary.md
AI/rules.md
Docs/CoreEngine/architecture.md
Docs/CoreEngine/concepts.md
Docs/CoreEngine/module-guide.md
Docs/CoreEngine/numeric-infrastructure.md
Docs/CoreEngine/testing.md
Docs/roadmap.md
```

---

## Ключевые исходники CoreEngine

```text
src/CoreEngine/Contracts/EngineInterface.php
src/CoreEngine/Contracts/RegistrableEngineInterface.php
src/CoreEngine/Contracts/ContainerInterface.php
src/CoreEngine/Contracts/MathKernelInterface.php
src/CoreEngine/Contracts/DeterministicRandomInterface.php
src/CoreEngine/Contracts/SnapshotStoreInterface.php
src/CoreEngine/Core/Kernel.php
src/CoreEngine/Core/CoreServices.php
src/CoreEngine/Core/CoreEngineBootstrap.php
src/CoreEngine/Core/CoreEngineRuntime.php
src/CoreEngine/Core/EngineLoader.php
src/CoreEngine/Core/EngineManifest.php
src/CoreEngine/Core/ManifestLoader.php
src/CoreEngine/Core/EngineFactory.php
src/CoreEngine/Core/EngineDependencyResolver.php
src/CoreEngine/Core/EngineRegistration.php
src/CoreEngine/Core/EntityRegistry.php
src/CoreEngine/Core/EntityDiscovery.php
src/CoreEngine/Core/Container.php
src/CoreEngine/Core/ContainerEngineInstantiator.php
src/CoreEngine/Core/MathKernel.php
src/CoreEngine/Core/DeterministicRandom.php
src/CoreEngine/Core/SnapshotManager.php
src/CoreEngine/Core/RuntimeStateStore.php
src/CoreEngine/Core/InMemorySnapshotStore.php
```

---

## Тесты

```text
tests/CoreEngine/KernelTest.php
tests/CoreEngine/ManifestLoaderTest.php
tests/CoreEngine/EngineFactoryTest.php
tests/CoreEngine/EngineLoaderTest.php
tests/CoreEngine/EngineDependencyResolverTest.php
tests/CoreEngine/EngineRegistrationTest.php
tests/CoreEngine/EntityRegistryTest.php
tests/CoreEngine/EntityDiscoveryTest.php
tests/CoreEngine/MathKernelTest.php
tests/CoreEngine/DeterministicRandomTest.php
tests/CoreEngine/SnapshotManagerTest.php
tests/CoreEngine/CoreEngineBootstrapTest.php
tests/CoreEngine/ContainerTest.php
tests/CoreEngine/ContainerEngineInstantiatorTest.php
tests/CoreEngine/KernelTimeControlTest.php
tests/CoreEngine/PersistentRuntimeTest.php
```

---

## Фикстуры

```text
tests/Fixtures/Engines/StubEngine
tests/Fixtures/Engines/RegistrableStubEngine
tests/Fixtures/Container
```

---

## Порядок загрузки контекста

1. `AI/system-prompt.md`
2. `AI/rules.md`
3. `AI/project-overview.md`
4. `AI/glossary.md`
5. `Docs/CoreEngine/architecture.md`
6. `Docs/CoreEngine/concepts.md`
7. `Docs/CoreEngine/module-guide.md`
8. `Docs/CoreEngine/numeric-infrastructure.md`
9. `Docs/CoreEngine/testing.md`
10. `Docs/roadmap.md` (план развития: инфраструктура → фасад → доменные движки)
11. Ключевые исходники CoreEngine по необходимости.
