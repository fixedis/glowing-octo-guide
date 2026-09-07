<?php

declare(strict_types=1);

// src/CoreEngine/Contracts/TickSystemInterface.php

namespace Project\CoreEngine\Contracts;

use Project\CoreEngine\Core\TickContext;

interface TickSystemInterface
{
    public function name(): string;

    public function update(TickContext $context): void;
}
