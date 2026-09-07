<?php

declare(strict_types=1);

// src/CoreEngine/Core/ManifestLoader.php

namespace Project\CoreEngine\Core;

use InvalidArgumentException;
use JsonException;
use Project\CoreEngine\Contracts\LoggerInterface;
use RuntimeException;

final class ManifestLoader
{
    public function __construct(
        private readonly LoggerInterface $logger
    ) {
    }

    public function loadFromFile(string $manifestPath): EngineManifest
    {
        if (!is_file($manifestPath)) {
            $this->logger->error('Engine manifest file not found.', [
                'manifest_path' => $manifestPath,
            ]);

            throw new InvalidArgumentException(sprintf(
                'Engine manifest file not found: %s',
                $manifestPath
            ));
        }

        $json = file_get_contents($manifestPath);

        if ($json === false) {
            $this->logger->error('Engine manifest file is not readable.', [
                'manifest_path' => $manifestPath,
            ]);

            throw new RuntimeException(sprintf(
                'Engine manifest file is not readable: %s',
                $manifestPath
            ));
        }

        try {
            $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            $this->logger->error('Engine manifest JSON is invalid.', [
                'manifest_path' => $manifestPath,
                'error' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
            ]);

            throw new RuntimeException(sprintf(
                'Engine manifest JSON is invalid: %s',
                $manifestPath
            ), 0, $exception);
        }

        if (!is_array($data)) {
            $this->logger->error('Engine manifest root must be an object.', [
                'manifest_path' => $manifestPath,
            ]);

            throw new RuntimeException(sprintf(
                'Engine manifest root must be an object: %s',
                $manifestPath
            ));
        }

        $manifest = $this->parse($data, $manifestPath);

        $this->logger->info('Engine manifest loaded.', [
            'engine_id' => $manifest->id,
            'engine_version' => $manifest->version,
            'manifest_path' => $manifestPath,
        ]);

        return $manifest;
    }

    /**
     * @return array<string, EngineManifest>
     */
    public function loadFromEnginesDirectory(string $enginesPath): array
    {
        $enginesPath = $this->normalizePath($enginesPath);

        if (!is_dir($enginesPath)) {
            $this->logger->error('Engines directory not found.', [
                'engines_path' => $enginesPath,
            ]);

            throw new InvalidArgumentException(sprintf(
                'Engines directory not found: %s',
                $enginesPath
            ));
        }

        $entries = scandir($enginesPath);

        if ($entries === false) {
            $this->logger->error('Engines directory is not readable.', [
                'engines_path' => $enginesPath,
            ]);

            throw new RuntimeException(sprintf(
                'Engines directory is not readable: %s',
                $enginesPath
            ));
        }

        $directories = [];

        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }

            $fullPath = $enginesPath . DIRECTORY_SEPARATOR . $entry;

            if (is_dir($fullPath)) {
                $directories[] = $entry;
            }
        }

        sort($directories, SORT_STRING);

        $manifests = [];

        foreach ($directories as $directory) {
            $manifestPath = $enginesPath
                . DIRECTORY_SEPARATOR
                . $directory
                . DIRECTORY_SEPARATOR
                . 'Config'
                . DIRECTORY_SEPARATOR
                . 'engine.manifest.json';

            if (!is_file($manifestPath)) {
                continue;
            }

            $manifest = $this->loadFromFile($manifestPath);

            if (isset($manifests[$manifest->id])) {
                $this->logger->error('Duplicate engine id found.', [
                    'engine_id' => $manifest->id,
                    'manifest_path' => $manifestPath,
                ]);

                throw new RuntimeException(sprintf(
                    'Duplicate engine id "%s" found while loading engines directory: %s',
                    $manifest->id,
                    $enginesPath
                ));
            }

            $manifests[$manifest->id] = $manifest;
        }

        $this->logger->info('Engines manifests loaded.', [
            'engines_path' => $enginesPath,
            'count' => count($manifests),
        ]);

        return $manifests;
    }

    /**
     * @param array<string, mixed> $data
     */
    private function parse(array $data, string $manifestPath): EngineManifest
    {
        $id = $this->requireString($data, 'id', $manifestPath);
        $version = $this->requireString($data, 'version', $manifestPath);
        $apiVersion = $this->requireString($data, 'apiVersion', $manifestPath);
        $engineClass = $this->requireString($data, 'engineClass', $manifestPath);

        $name = $id;

        if (isset($data['name']) && is_string($data['name']) && trim($data['name']) !== '') {
            $name = trim($data['name']);
        }

        $bridge = null;

        if (isset($data['bridge']) && is_string($data['bridge']) && trim($data['bridge']) !== '') {
            $bridge = trim($data['bridge']);
        }

        return new EngineManifest(
            $id,
            $name,
            $version,
            $apiVersion,
            $engineClass,
            $this->optionalStringList($data, 'requires', $manifestPath),
            $this->optionalStringList($data, 'provides', $manifestPath),
            $this->optionalStringList($data, 'commands', $manifestPath),
            $this->optionalStringList($data, 'events', $manifestPath),
            $this->optionalEntities($data, $manifestPath),
            $bridge,
            $this->normalizePath(dirname($manifestPath, 2))
        );
    }

    /**
     * @param array<string, mixed> $data
     */
    private function requireString(array $data, string $key, string $manifestPath): string
    {
        if (!isset($data[$key]) || !is_string($data[$key]) || trim($data[$key]) === '') {
            $this->logger->error('Engine manifest field is missing or invalid.', [
                'manifest_path' => $manifestPath,
                'field' => $key,
            ]);

            throw new RuntimeException(sprintf(
                'Engine manifest field "%s" is missing or invalid in file: %s',
                $key,
                $manifestPath
            ));
        }

        return trim($data[$key]);
    }

    /**
     * @param array<string, mixed> $data
     *
     * @return list<string>
     */
    private function optionalStringList(array $data, string $key, string $manifestPath): array
    {
        if (!isset($data[$key])) {
            return [];
        }

        if (!is_array($data[$key])) {
            $this->logger->error('Engine manifest field must be an array.', [
                'manifest_path' => $manifestPath,
                'field' => $key,
            ]);

            throw new RuntimeException(sprintf(
                'Engine manifest field "%s" must be an array in file: %s',
                $key,
                $manifestPath
            ));
        }

        $result = [];

        foreach ($data[$key] as $value) {
            if (!is_string($value) || trim($value) === '') {
                $this->logger->error('Engine manifest list field contains invalid value.', [
                    'manifest_path' => $manifestPath,
                    'field' => $key,
                ]);

                throw new RuntimeException(sprintf(
                    'Engine manifest field "%s" contains invalid string value in file: %s',
                    $key,
                    $manifestPath
                ));
            }

            $result[] = trim($value);
        }

        return array_values($result);
    }

    /**
     * @param array<string, mixed> $data
     *
     * @return array{
     *     path: string,
     *     interface: string,
     *     autoload: bool
     * }|null
     */
    private function optionalEntities(array $data, string $manifestPath): ?array
    {
        if (!isset($data['entities'])) {
            return null;
        }

        if (!is_array($data['entities'])) {
            $this->logger->error('Engine manifest entities section must be an object.', [
                'manifest_path' => $manifestPath,
            ]);

            throw new RuntimeException(sprintf(
                'Engine manifest entities section must be an object in file: %s',
                $manifestPath
            ));
        }

        $entities = $data['entities'];

        $path = $this->requireString($entities, 'path', $manifestPath . ' [entities]');
        $interface = $this->requireString($entities, 'interface', $manifestPath . ' [entities]');

        $autoload = true;

        if (isset($entities['autoload'])) {
            $autoload = (bool) $entities['autoload'];
        }

        return [
            'path' => $path,
            'interface' => $interface,
            'autoload' => $autoload,
        ];
    }

    private function normalizePath(string $path): string
    {
        return rtrim(str_replace('\\', '/', $path), '/');
    }
}
