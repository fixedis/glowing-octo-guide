<?php

declare(strict_types=1);

// src/CoreEngine/Core/InMemorySnapshotStore.php

namespace Project\CoreEngine\Core;

use InvalidArgumentException;
use LogicException;
use Project\CoreEngine\Contracts\SnapshotStoreInterface;

final class InMemorySnapshotStore implements SnapshotStoreInterface
{
    /**
     * @var array<int, Snapshot>
     */
    private array $snapshots = [];

    public function save(Snapshot $snapshot): void
    {
        if ($snapshot->tick < 0) {
            throw new InvalidArgumentException(sprintf(
                'Snapshot tick cannot be negative. Tick: %d',
                $snapshot->tick
            ));
        }

        $existing = $this->snapshots[$snapshot->tick] ?? null;

        if ($existing !== null && $existing->hash !== $snapshot->hash) {
            throw new LogicException(sprintf(
                'Snapshot for tick %d already exists with a different hash.',
                $snapshot->tick
            ));
        }

        if ($existing !== null) {
            return;
        }

        $this->snapshots[$snapshot->tick] = $snapshot;

        ksort($this->snapshots, SORT_NUMERIC);
    }

    public function findByTick(int $tick): ?Snapshot
    {
        return $this->snapshots[$tick] ?? null;
    }

    public function latest(): ?Snapshot
    {
        if ($this->snapshots === []) {
            return null;
        }

        $ticks = array_keys($this->snapshots);
        $maxTick = max($ticks);

        return $this->snapshots[$maxTick];
    }

    /**
     * @return list<Snapshot>
     */
    public function all(): array
    {
        return array_values($this->snapshots);
    }

    public function clear(): void
    {
        $this->snapshots = [];
    }
}
