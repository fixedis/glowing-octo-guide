<?php

declare(strict_types=1);

// tests/Fixtures/Engines/StubEngine/Entities/StubEntity.php

namespace Project\Tests\Fixtures\Engines\StubEngine\Entities;

use Project\Tests\Fixtures\Engines\StubEngine\Contracts\StubEntityInterface;

final class StubEntity implements StubEntityInterface
{
    public function entityType(): string
    {
        return 'stub-entity';
    }
}
