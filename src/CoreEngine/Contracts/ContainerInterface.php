<?php

declare(strict_types=1);

// src/CoreEngine/Contracts/ContainerInterface.php

namespace Project\CoreEngine\Contracts;

interface ContainerInterface
{
    public function get(string $id): mixed;

    public function has(string $id): bool;
}
