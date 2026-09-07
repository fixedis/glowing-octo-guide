<?php

declare(strict_types=1);

// tests/Fixtures/Container/StubDependency.php

namespace Project\Tests\Fixtures\Container;

final class StubDependency
{
    public function value(): string
    {
        return 'stub-dependency';
    }
}
