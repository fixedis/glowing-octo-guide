<?php

declare(strict_types=1);

// src/Engines/AdminEngine/Core/Commands/AdminSetGodModeHandler.php

namespace Project\Engines\AdminEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;

/**
 * Переключает режим бога (server-side флаг, не клиентский чекбокс).
 *
 * Влияет на хендлеры спавна (UniverseEngine): при включённом godmode
 * координаты не валидируются.
 */
final class AdminSetGodModeHandler implements CommandHandlerInterface
{
    private const GODMODE_KEY = 'admin.godmode';

    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $enabled = $command->payload['enabled'] ?? null;

        if (!is_bool($enabled)) {
            return CommandResult::fail('AdminSetGodMode requires boolean "enabled".');
        }

        $state->set(self::GODMODE_KEY, $enabled);

        return CommandResult::ok([
            new Event(
                sprintf('god_mode_changed_%s', $command->id),
                'GodModeChanged',
                ['enabled' => $enabled],
                (int) ($state->get('tick', 0))
            ),
        ]);
    }
}
