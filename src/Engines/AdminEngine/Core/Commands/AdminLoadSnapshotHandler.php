<?php

declare(strict_types=1);

// src/Engines/AdminEngine/Core/Commands/AdminLoadSnapshotHandler.php

namespace Project\Engines\AdminEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;
use Project\CoreEngine\Core\SnapshotManager;

/**
 * Загрузка сохранённого снапшота в текущее состояние.
 *
 * Читает снапшот по tick через SnapshotManager и восстанавливает State
 * (с проверкой хэша).
 */
final class AdminLoadSnapshotHandler implements CommandHandlerInterface
{
    public function __construct(
        private readonly SnapshotManager $snapshots
    ) {
    }

    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $tick = $command->payload['tick'] ?? null;

        if (!is_int($tick) || $tick < 0) {
            return CommandResult::fail('AdminLoadSnapshot requires non-negative integer "tick".');
        }

        $snapshot = $this->snapshots->findByTick($tick);

        if ($snapshot === null) {
            return CommandResult::fail(sprintf('Snapshot for tick %d not found.', $tick));
        }

        $this->snapshots->restoreIntoState($snapshot, $state);

        return CommandResult::ok([
            new Event(
                sprintf('snapshot_loaded_%s', $command->id),
                'SnapshotLoaded',
                ['tick' => $snapshot->tick, 'hash' => $snapshot->hash],
                (int) ($state->get('tick', 0))
            ),
        ]);
    }
}
