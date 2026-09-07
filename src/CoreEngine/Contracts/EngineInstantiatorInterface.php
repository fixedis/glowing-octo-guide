<?php

declare(strict_types=1);

// src/CoreEngine/Contracts/EngineInstantiatorInterface.php

namespace Project\CoreEngine\Contracts;

interface EngineInstantiatorInterface
{
    public function instantiate(string $engineClass): EngineInterface;
}
