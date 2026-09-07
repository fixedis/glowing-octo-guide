<?php

declare(strict_types=1);

// tests/CoreEngine/EntityRegistryTest.php

namespace Project\Tests\CoreEngine;

use LogicException;
use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\EntityRegistry;
use Project\CoreEngine\Core\Logging\NullLogger;
use Project\Tests\Fixtures\Engines\StubEngine\Entities\StubEntity;
use RuntimeException;

final class EntityRegistryTest extends TestCase
{
    public function testRegistersClassesForEngine(): void
    {
        $registry = new EntityRegistry(new NullLogger());

        $registry->registerClasses('stub-engine', [
            StubEntity::class,
        ]);

        self::assertTrue($registry->hasEngine('stub-engine'));
        self::assertSame([StubEntity::class], $registry->classesForEngine('stub-engine'));
    }

    public function testThrowsExceptionOnDuplicateEntityClass(): void
    {
        $registry = new EntityRegistry(new NullLogger());

        $registry->registerClass('stub-engine', StubEntity::class);

        $this->expectException(LogicException::class);

        $registry->registerClass('stub-engine', StubEntity::class);
    }

    public function testThrowsExceptionWhenClassDoesNotExist(): void
    {
        $registry = new EntityRegistry(new NullLogger());

        $this->expectException(RuntimeException::class);

        $registry->registerClass('stub-engine', 'Project\Missing\MissingEntity');
    }
}
