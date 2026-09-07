<?php

declare(strict_types=1);

// src/CoreEngine/Core/EntityDiscovery.php

namespace Project\CoreEngine\Core;

use Project\CoreEngine\Contracts\LoggerInterface;
use ReflectionClass;
use ReflectionException;
use RuntimeException;

final class EntityDiscovery
{
    public function __construct(
        private readonly LoggerInterface $logger
    ) {
    }

    /**
     * @return list<class-string>
     */
    public function discover(EngineManifest $manifest): array
    {
        $entities = $manifest->entities;

        if ($entities === null) {
            return [];
        }

        $autoload = $entities['autoload'] ?? true;

        if ($autoload === false) {
            $this->logger->info('Entity autoload is disabled for engine.', [
                'engine_id' => $manifest->id,
            ]);

            return [];
        }

        $basePath = $this->normalizePath($manifest->basePath);
        $relativePath = $this->normalizePath($entities['path']);

        if (str_contains($relativePath, '/')) {
            $this->logger->error('Nested entity path is not supported without explicit namespace.', [
                'engine_id' => $manifest->id,
                'entities_path' => $relativePath,
            ]);

            throw new RuntimeException(sprintf(
                'Engine "%s" uses nested entities path "%s". Use a single entities folder.',
                $manifest->id,
                $relativePath
            ));
        }

        $entitiesPath = $basePath . '/' . $relativePath;

        if (!is_dir($entitiesPath)) {
            $this->logger->error('Entities directory not found.', [
                'engine_id' => $manifest->id,
                'entities_path' => $entitiesPath,
            ]);

            throw new RuntimeException(sprintf(
                'Entities directory "%s" not found for engine "%s".',
                $entitiesPath,
                $manifest->id
            ));
        }

        $interface = $entities['interface'];

        if (!interface_exists($interface)) {
            $this->logger->error('Entity interface does not exist.', [
                'engine_id' => $manifest->id,
                'interface' => $interface,
            ]);

            throw new RuntimeException(sprintf(
                'Entity interface "%s" does not exist for engine "%s".',
                $interface,
                $manifest->id
            ));
        }

        $namespace = $this->deriveNamespace($manifest, $relativePath);

        $files = $this->scanPhpFiles($entitiesPath);

        $classes = [];

        foreach ($files as $file) {
            $relativeFilePath = ltrim(
                substr($file, strlen($entitiesPath)),
                '/'
            );

            $relativeClassPath = substr($relativeFilePath, 0, -4);

            $className = $namespace . '\\' . str_replace('/', '\\', $relativeClassPath);

            if (!class_exists($className)) {
                $this->logger->error('Entity class does not exist.', [
                    'engine_id' => $manifest->id,
                    'file' => $file,
                    'expected_class' => $className,
                ]);

                throw new RuntimeException(sprintf(
                    'Entity class "%s" does not exist. File: %s',
                    $className,
                    $file
                ));
            }

            try {
                $reflection = new ReflectionClass($className);
            } catch (ReflectionException $exception) {
                $this->logger->error('Entity class cannot be reflected.', [
                    'engine_id' => $manifest->id,
                    'class' => $className,
                    'error' => $exception->getMessage(),
                    'file' => $exception->getFile(),
                    'line' => $exception->getLine(),
                ]);

                throw new RuntimeException(sprintf(
                    'Entity class "%s" cannot be reflected for engine "%s".',
                    $className,
                    $manifest->id
                ), 0, $exception);
            }

            if (!$reflection->isInstantiable()) {
                $this->logger->debug('Skipping non-instantiable entity class.', [
                    'engine_id' => $manifest->id,
                    'class' => $className,
                ]);

                continue;
            }

            if (!$reflection->implementsInterface($interface)) {
                $this->logger->error('Entity class does not implement required interface.', [
                    'engine_id' => $manifest->id,
                    'class' => $className,
                    'interface' => $interface,
                ]);

                throw new RuntimeException(sprintf(
                    'Entity class "%s" must implement interface "%s" for engine "%s".',
                    $className,
                    $interface,
                    $manifest->id
                ));
            }

            $classes[] = $className;
        }

        $this->logger->info('Entity discovery completed.', [
            'engine_id' => $manifest->id,
            'entities_path' => $entitiesPath,
            'classes_count' => count($classes),
        ]);

        return array_values($classes);
    }

    private function deriveNamespace(EngineManifest $manifest, string $relativePath): string
    {
        $lastSeparator = strrpos($manifest->engineClass, '\\');

        if ($lastSeparator === false) {
            $this->logger->error('Engine class has no namespace.', [
                'engine_id' => $manifest->id,
                'engine_class' => $manifest->engineClass,
            ]);

            throw new RuntimeException(sprintf(
                'Engine class "%s" has no namespace for engine "%s".',
                $manifest->engineClass,
                $manifest->id
            ));
        }

        $engineNamespace = substr($manifest->engineClass, 0, $lastSeparator);

        $folder = basename($relativePath);

        $folderSegment = str_replace(
            ' ',
            '',
            ucwords(str_replace(['-', '_'], ' ', $folder))
        );

        if ($folderSegment === '') {
            $this->logger->error('Entities folder name is invalid.', [
                'engine_id' => $manifest->id,
                'entities_path' => $relativePath,
            ]);

            throw new RuntimeException(sprintf(
                'Entities folder name is invalid for engine "%s".',
                $manifest->id
            ));
        }

        return $engineNamespace . '\\' . $folderSegment;
    }

    /**
     * @return list<string>
     */
    private function scanPhpFiles(string $path): array
    {
        $entries = scandir($path);

        if ($entries === false) {
            $this->logger->error('Entities directory is not readable.', [
                'entities_path' => $path,
            ]);

            throw new RuntimeException(sprintf(
                'Entities directory "%s" is not readable.',
                $path
            ));
        }

        $files = [];

        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }

            $fullPath = $this->normalizePath($path . '/' . $entry);

            if (is_dir($fullPath)) {
                $files = array_merge($files, $this->scanPhpFiles($fullPath));
                continue;
            }

            if (is_file($fullPath) && str_ends_with(strtolower($entry), '.php')) {
                $files[] = $fullPath;
            }
        }

        sort($files, SORT_STRING);

        return array_values($files);
    }

    private function normalizePath(string $path): string
    {
        return rtrim(str_replace('\\', '/', $path), '/');
    }
}
