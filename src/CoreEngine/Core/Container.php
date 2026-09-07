<?php

declare(strict_types=1);

// src/CoreEngine/Core/Container.php

namespace Project\CoreEngine\Core;

use Closure;
use LogicException;
use Project\CoreEngine\Contracts\ContainerInterface;
use ReflectionClass;
use ReflectionException;
use ReflectionNamedType;
use RuntimeException;
use Throwable;

final class Container implements ContainerInterface
{
    /**
     * @var array<string, object>
     */
    private array $instances = [];

    /**
     * @var array<string, Closure>
     */
    private array $factories = [];

    /**
     * @var array<string, bool>
     */
    private array $resolving = [];

    public function bindInstance(string $id, object $instance): void
    {
        $this->assertNotBound($id);

        $this->instances[$id] = $instance;
    }

    public function bindFactory(string $id, Closure $factory): void
    {
        $this->assertNotBound($id);

        $this->factories[$id] = $factory;
    }

    public function has(string $id): bool
    {
        return isset($this->instances[$id]) || isset($this->factories[$id]);
    }

    public function get(string $id): mixed
    {
        if (isset($this->instances[$id])) {
            return $this->instances[$id];
        }

        if (isset($this->factories[$id])) {
            if (isset($this->resolving[$id])) {
                throw new RuntimeException(sprintf(
                    'Circular dependency detected while resolving service "%s".',
                    $id
                ));
            }

            $this->resolving[$id] = true;

            try {
                $service = ($this->factories[$id])($this);
            } finally {
                unset($this->resolving[$id]);
            }

            if (!is_object($service)) {
                throw new RuntimeException(sprintf(
                    'Factory for service "%s" must return an object.',
                    $id
                ));
            }

            $this->instances[$id] = $service;

            return $service;
        }

        if (isset($this->resolving[$id])) {
            throw new RuntimeException(sprintf(
                'Circular dependency detected while resolving service "%s".',
                $id
            ));
        }

        $this->resolving[$id] = true;

        try {
            $service = $this->create($id);
        } finally {
            unset($this->resolving[$id]);
        }

        $this->instances[$id] = $service;

        return $service;
    }

    private function create(string $id): object
    {
        if (!class_exists($id)) {
            throw new RuntimeException(sprintf(
                'Service "%s" is not bound and class does not exist.',
                $id
            ));
        }

        try {
            $reflection = new ReflectionClass($id);
        } catch (ReflectionException $exception) {
            throw new RuntimeException(sprintf(
                'Service "%s" cannot be reflected: %s',
                $id,
                $exception->getMessage()
            ), 0, $exception);
        }

        if (!$reflection->isInstantiable()) {
            throw new RuntimeException(sprintf(
                'Service "%s" is not instantiable.',
                $id
            ));
        }

        $constructor = $reflection->getConstructor();

        if ($constructor === null) {
            return $reflection->newInstance();
        }

        $arguments = [];

        foreach ($constructor->getParameters() as $parameter) {
            $type = $parameter->getType();

            if ($type instanceof ReflectionNamedType && !$type->isBuiltin()) {
                $typeName = $type->getName();

                try {
                    if ($this->has($typeName) || class_exists($typeName)) {
                        $arguments[] = $this->get($typeName);
                        continue;
                    }
                } catch (Throwable $exception) {
                    throw new RuntimeException(sprintf(
                        'Unable to resolve parameter "%s" for service "%s": %s',
                        $parameter->getName(),
                        $id,
                        $exception->getMessage()
                    ), 0, $exception);
                }
            }

            if ($parameter->isDefaultValueAvailable()) {
                $arguments[] = $parameter->getDefaultValue();
                continue;
            }

            if ($type !== null && $type->allowsNull()) {
                $arguments[] = null;
                continue;
            }

            throw new RuntimeException(sprintf(
                'Unable to resolve parameter "%s" for service "%s".',
                $parameter->getName(),
                $id
            ));
        }

        return $reflection->newInstanceArgs($arguments);
    }

    private function assertNotBound(string $id): void
    {
        if ($this->has($id)) {
            throw new LogicException(sprintf(
                'Service "%s" is already bound.',
                $id
            ));
        }
    }
}
