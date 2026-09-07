<?php

declare(strict_types=1);

// tests/Engines/UniverseEngine/FileBuildingDeltaStoreTest.php

namespace Project\Tests\Engines\UniverseEngine;

use PHPUnit\Framework\TestCase;
use Project\Engines\UniverseEngine\Contracts\BuildingDeltaStoreInterface;
use Project\Engines\UniverseEngine\Core\Colony\FileBuildingDeltaStore;
use RuntimeException;

final class FileBuildingDeltaStoreTest extends TestCase
{
    private string $storagePath;

    protected function setUp(): void
    {
        $this->storagePath = sys_get_temp_dir() . '/ue_delta_' . uniqid('', true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->storagePath);
    }

    public function testGetDeltaReturnsNullWhenNoFile(): void
    {
        $store = new FileBuildingDeltaStore($this->storagePath);

        self::assertNull($store->getDelta(1337, 0, 1, 2));
    }

    public function testPlacePersistsAcrossInstances(): void
    {
        $first = new FileBuildingDeltaStore($this->storagePath);
        $first->place(1337, 0, 1, 2, 'dome');

        $second = new FileBuildingDeltaStore($this->storagePath);

        self::assertSame('dome', $second->getDelta(1337, 0, 1, 2));
    }

    public function testDemolishPersistsRemoved(): void
    {
        $first = new FileBuildingDeltaStore($this->storagePath);
        $first->demolish(1337, 0, 1, 2);

        $second = new FileBuildingDeltaStore($this->storagePath);

        self::assertSame(
            BuildingDeltaStoreInterface::REMOVED,
            $second->getDelta(1337, 0, 1, 2)
        );
    }

    public function testPlaceOverwritesPreviousType(): void
    {
        $store = new FileBuildingDeltaStore($this->storagePath);

        $store->place(1337, 0, 1, 2, 'dome');
        $store->place(1337, 0, 1, 2, 'tower');

        $fresh = new FileBuildingDeltaStore($this->storagePath);

        self::assertSame('tower', $fresh->getDelta(1337, 0, 1, 2));
    }

    public function testThrowsOnCorruptedFile(): void
    {
        if (!is_dir($this->storagePath)) {
            mkdir($this->storagePath, 0777, true);
        }

        file_put_contents($this->storagePath . '/planet_5.json', '{not json');

        $store = new FileBuildingDeltaStore($this->storagePath);

        $this->expectException(RuntimeException::class);

        $store->getDelta(5, 0, 0, 0);
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        $items = scandir($dir) ?: [];

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $full = $dir . '/' . $item;

            is_dir($full) ? $this->removeDir($full) : unlink($full);
        }

        rmdir($dir);
    }
}
