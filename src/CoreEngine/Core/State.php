<?php

declare(strict_types=1);

// src/CoreEngine/Core/State.php

namespace Project\CoreEngine\Core;

use Project\CoreEngine\Contracts\StateInterface;

final class State implements StateInterface
{
    /**
     * @var array<string, mixed>
     */
    private array $data = [];

    public function get(string $key, mixed $default = null): mixed
    {
        return $this->data[$key] ?? $default;
    }

    public function set(string $key, mixed $value): void
    {
        $this->data[$key] = $value;
    }

    public function has(string $key): bool
    {
        return array_key_exists($key, $this->data);
    }

    public function remove(string $key): void
    {
        unset($this->data[$key]);
    }

    /**
     * @return array<string, mixed>
     */
    public function all(): array
    {
        return $this->data;
    }
}
