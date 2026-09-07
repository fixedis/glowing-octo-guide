<?php

declare(strict_types=1);

// tests/CoreEngine/FileSnapshotStoreTest.php

namespace Project\Tests\CoreEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\FileSnapshotStore;
use Project\CoreEngine\Core\Snapshot;
use RuntimeException;

final class FileSnapshotStoreTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        $this->dir = sys_get_temp_dir() . '/coreengine_snap_' . bin2hex(random_bytes(8));
    }

    protected function tearDown(): void
    {
        $store = new FileSnapshotStore($this->dir);
        $store->clear();

        if (is_dir($this->dir)) {
            rmdir($this->dir);
        }
    }

    private function store(): FileSnapshotStore
    {
        return new FileSnapshotStore($this->dir);
    }

    private function snapshot(int $tick, string $hash = 'h'): Snapshot
    {
        return new Snapshot($tick, ['tick' => $tick], $hash);
    }

    public function testSaveAndFindByTick(): void
    {
        $store = $this->store();
        $store->save($this->snapshot(5));

        $found = $store->findByTick(5);

        self::assertNotNull($found);
        self::assertSame(5, $found->tick);
        self::assertSame('h', $found->hash);
    }

    public function testFindMissingReturnsNull(): void
    {
        self::assertNull($this->store()->findByTick(999));
    }

    public function testNegativeTickIsRejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->store()->save($this->snapshot(-1));
    }

    public function testDuplicateWithSameHashIsIgnored(): void
    {
        $store = $this->store();
        $store->save($this->snapshot(3, 'same'));
        $store->save($this->snapshot(3, 'same'));

        self::assertCount(1, $store->all());
    }

    public function testDuplicateWithDifferentHashThrows(): void
    {
        $store = $this->store();
        $store->save($this->snapshot(3, 'a'));

        $this->expectException(\LogicException::class);
        $store->save($this->snapshot(3, 'b'));
    }

    public function testLatestReturnsHighestTick(): void
    {
        $store = $this->store();
        $store->save($this->snapshot(1));
        $store->save($this->snapshot(10));
        $store->save($this->snapshot(4));

        $latest = $store->latest();

        self::assertNotNull($latest);
        self::assertSame(10, $latest->tick);
    }

    public function testAllReturnsSortedByTick(): void
    {
        $store = $this->store();
        $store->save($this->snapshot(7));
        $store->save($this->snapshot(2));
        $store->save($this->snapshot(15));

        $ticks = array_map(static fn (Snapshot $s): int => $s->tick, $store->all());

        self::assertSame([2, 7, 15], $ticks);
    }

    public function testClearRemovesFiles(): void
    {
        $store = $this->store();
        $store->save($this->snapshot(1));
        $store->save($this->snapshot(2));

        $store->clear();

        self::assertNull($store->findByTick(1));
        self::assertNull($store->findByTick(2));
        self::assertSame([], $store->all());
    }

    public function testPersistsAcrossInstances(): void
    {
        $first = $this->store();
        $first->save($this->snapshot(42, 'persist'));

        // Новый экземпляр с той же директорией "видит" сохранённое.
        $second = $this->store();
        $found = $second->findByTick(42);

        self::assertNotNull($found);
        self::assertSame(42, $found->tick);
        self::assertSame('persist', $found->hash);
    }

    public function testCreatesDirectoryIfMissing(): void
    {
        $nested = $this->dir . '/nested/deep';
        $store = new FileSnapshotStore($nested);
        $store->save($this->snapshot(1));

        self::assertDirectoryExists($nested);
        self::assertNotNull($store->findByTick(1));
    }

    public function testMissingDirectoryIsCreatedOnConstruct(): void
    {
        $path = sys_get_temp_dir() . '/coreengine_new_' . bin2hex(random_bytes(8));

        try {
            $store = new FileSnapshotStore($path);
            self::assertDirectoryExists($path);
        } finally {
            if (is_dir($path)) {
                (new FileSnapshotStore($path))->clear();
                rmdir($path);
            }
        }
    }
}
