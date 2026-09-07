<?php

declare(strict_types=1);

// tests/Fixtures/Container/StubService.php

namespace Project\Tests\Fixtures\Container;

final class StubService
{
    public function __construct(
        public readonly StubDependency $dependency
    ) {
    }
}
