<?php

declare(strict_types=1);

// tests/CoreEngine/SnapshotManagerTest.php

namespace Project\Tests\CoreEngine;

use LogicException;
use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\InMemorySnapshotStore;
use Project\CoreEngine\Core\Logging\NullLogger;
use Project\CoreEngine\Core\Snapshot;
use Project\CoreEngine\Core\SnapshotManager;
use Project\CoreEngine\Core\State;
use RuntimeException;

final class SnapshotManagerTest extends TestCase
{
    private function createManager(): SnapshotManager
    {
        return new SnapshotManager(
            new InMemorySnapshotStore(),
            new NullLogger()
        );
    }

    public function testCreatesAndPersistsSnapshot(): void
    {
        $manager = $this->createManager();

        $snapshot = $manager->createFromState(1, [
            'counter' => 5,
        ]);

        $manager->persist($snapshot);

        $latest = $manager->latest();

        self::assertNotNull($latest);
        self::assertSame(1, $latest->tick);
        self::assertSame($snapshot->hash, $latest->hash);
        self::assertSame(['counter' => 5], $latest->state);

        $found = $manager->findByTick(1);

        self::assertNotNull($found);
        self::assertSame($snapshot->hash, $found->hash);
    }

    public function testRestoresSnapshotIntoState(): void
    {
        $manager = $this->createManager();

        $state = new State();
        $state->set('old_key', 'old_value');

        $snapshot = $manager->createFromState(2, [
            'counter' => 7,
            'tick' => 2,
        ]);

        $manager->restoreIntoState($snapshot, $state);

        self::assertFalse($state->has('old_key'));
        self::assertSame(7, $state->get('counter'));
        self::assertSame(2, $state->get('tick'));
    }

    public function testThrowsExceptionOnHashMismatch(): void
    {
        $manager = $this->createManager();

        $state = new State();

        $brokenSnapshot = new Snapshot(
            3,
            [
                'counter' => 1,
            ],
            'invalid-hash'
        );

        $this->expectException(RuntimeException::class);

        $manager->restoreIntoState($brokenSnapshot, $state);
    }

    public function testThrowsExceptionOnDuplicateTickWithDifferentHash(): void
    {
        $manager = $this->createManager();

        $first = $manager->createFromState(4, [
            'value' => 'first',
        ]);

        $manager->persist($first);

        $second = new Snapshot(
            4,
            [
                'value' => 'second',
            ],
            $manager->hashState([
                'value' => 'second',
            ])
        );

        $this->expectException(LogicException::class);

        $manager->persist($second);
    }
}
