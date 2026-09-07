<?php

declare(strict_types=1);

// src/CoreEngine/Contracts/SnapshotStoreInterface.php

namespace Project\CoreEngine\Contracts;

use Project\CoreEngine\Core\Snapshot;

interface SnapshotStoreInterface
{
    public function save(Snapshot $snapshot): void;

    public function findByTick(int $tick): ?Snapshot;

    public function latest(): ?Snapshot;

    /**
     * @return list<Snapshot>
     */
    public function all(): array;

    public function clear(): void;
}
