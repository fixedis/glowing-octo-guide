<?php

declare(strict_types=1);

// src/Engines/AdminEngine/Core/Commands/AdminSaveSnapshotHandler.php

namespace Project\Engines\AdminEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;
use Project\CoreEngine\Core\SnapshotManager;

/**
 * Ручное сохранение снапшота текущего состояния.
 *
 * Создаёт снапшот из State через SnapshotManager и сохраняет в хранилище.
 */
final class AdminSaveSnapshotHandler implements CommandHandlerInterface
{
    public function __construct(
        private readonly SnapshotManager $snapshots
    ) {
    }

    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $tick = (int) ($state->get('tick', 0));
        $snapshot = $this->snapshots->createFromState($tick, $state->all());
        $this->snapshots->persist($snapshot);

        return CommandResult::ok([
            new Event(
                sprintf('snapshot_saved_%s', $command->id),
                'SnapshotSaved',
                ['tick' => $snapshot->tick, 'hash' => $snapshot->hash],
                $tick
            ),
        ]);
    }
}
