<?php

declare(strict_types=1);

// src/CoreEngine/Core/CoreEngineBootstrap.php

namespace Project\CoreEngine\Core;

use Project\CoreEngine\Contracts\ContainerInterface;
use Project\CoreEngine\Contracts\DeterministicRandomInterface;
use Project\CoreEngine\Contracts\EngineInstantiatorInterface;
use Project\CoreEngine\Contracts\LoggerInterface;
use Project\CoreEngine\Contracts\MathKernelInterface;
use Project\CoreEngine\Contracts\SnapshotStoreInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\RuntimeStateStore;

final class CoreEngineBootstrap
{
    public function __construct(
        private readonly LoggerInterface $logger
    ) {
    }

    public function createRuntime(string $enginesPath, string $seed): CoreEngineRuntime
    {
        $this->logger->info('CoreEngine bootstrap started.', [
            'engines_path' => $enginesPath,
        ]);

        $container = new Container();

        $container->bindInstance(LoggerInterface::class, $this->logger);
        $container->bindInstance(ContainerInterface::class, $container);

        $container->bindFactory(
            StateInterface::class,
            static fn (): StateInterface => new State()
        );

        $container->bindFactory(
            SnapshotStoreInterface::class,
            static function (): SnapshotStoreInterface {
                $dir = getenv('SNAPSHOT_DIR');

                if (is_string($dir) && $dir !== '') {
                    return new FileSnapshotStore(self::normalizePath($dir));
                }

                return new InMemorySnapshotStore();
            }
        );

        $container->bindFactory(
            RuntimeStateStore::class,
            static function (): RuntimeStateStore {
                $dir = getenv('SNAPSHOT_DIR');
                $dir = is_string($dir) && $dir !== ''
                    ? self::normalizePath($dir)
                    : sys_get_temp_dir() . '/coreengine_rt';

                return new RuntimeStateStore($dir);
            }
        );

        $container->bindFactory(
            MathKernelInterface::class,
            static fn (ContainerInterface $container): MathKernelInterface => new MathKernel(
                $container->get(LoggerInterface::class)
            )
        );

        $container->bindFactory(
            DeterministicRandomInterface::class,
            static function (ContainerInterface $container) use ($seed): DeterministicRandomInterface {
                return new DeterministicRandom(
                    $container->get(LoggerInterface::class),
                    $seed
                );
            }
        );

        $container->bindFactory(
            EngineInstantiatorInterface::class,
            static fn (ContainerInterface $container): EngineInstantiatorInterface => new ContainerEngineInstantiator(
                $container->get(ContainerInterface::class),
                $container->get(LoggerInterface::class)
            )
        );

        $container->bindFactory(
            CoreServices::class,
            static function (ContainerInterface $container): CoreServices {
                return new CoreServices(
                    $container->get(StateInterface::class),
                    $container->get(EventBus::class),
                    $container->get(CommandBus::class),
                    $container->get(SystemPipeline::class),
                    $container->get(EngineRegistry::class),
                    $container->get(EntityRegistry::class),
                    $container,
                    $container->get(MathKernelInterface::class),
                    $container->get(DeterministicRandomInterface::class),
                    $container->get(SnapshotManager::class),
                    $container->get(Kernel::class),
                    $container->get(LoggerInterface::class)
                );
            }
        );

        $services = $container->get(CoreServices::class);
        $kernel = $container->get(Kernel::class);
        $engineLoader = $container->get(EngineLoader::class);

        $engineLoader->loadFromDirectory($enginesPath);

        $kernel->boot();

        $this->logger->info('CoreEngine bootstrap completed.', [
            'engines_path' => $enginesPath,
            'engines_count' => count($services->engineRegistry->all()),
        ]);

        return new CoreEngineRuntime(
            $services,
            $kernel,
            $engineLoader,
            $container
        );
    }

    /**
     * Нормализует путь для кроссплатформенности.
     *
     * В MSYS/Git-Bash env-переменные приходят как `/c/Users/...`, что PHP-native
     * на Windows интерпретирует неверно. Конвертируем `/c/...` → `C:/...` и
     * приводим слеши к прямым.
     */
    private static function normalizePath(string $path): string
    {
        $path = rtrim($path, '/\\');

        if (preg_match('#^/(?P<drive>[a-z])/(?P<rest>.*)$#i', $path, $m)) {
            $path = strtoupper($m['drive']) . ':/' . $m['rest'];
        }

        return str_replace('/', '\\', $path);
    }
}
