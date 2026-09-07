<?php

declare(strict_types=1);

// src/Engines/AdminEngine/Core/Commands/AdminAuthenticateHandler.php

namespace Project\Engines\AdminEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;

/**
 * Серверная аутентификация администратора.
 *
 * Сравнивает переданный токен с ожидаемым (задан при регистрации из env
 * ADMIN_TOKEN). При успехе проставляет admin.session в State. Без ADMIN_TOKEN
 * auth отключён (dev-режим) — любой токен считается валидным.
 */
final class AdminAuthenticateHandler implements CommandHandlerInterface
{
    private const SESSION_KEY = 'admin.session';

    public function __construct(
        private readonly ?string $expectedToken
    ) {
    }

    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $token = $command->payload['token'] ?? null;

        if (!is_string($token) || $token === '') {
            return CommandResult::fail('AdminAuthenticate requires non-empty string "token".');
        }

        if ($this->expectedToken !== null && !hash_equals($this->expectedToken, $token)) {
            return CommandResult::fail('Admin authentication failed.');
        }

        $state->set(self::SESSION_KEY, hash('sha256', $token));

        return CommandResult::ok([
            new Event(
                sprintf('admin_authenticated_%s', $command->id),
                'AdminAuthenticated',
                ['tick' => (int) ($state->get('tick', 0))],
                (int) ($state->get('tick', 0))
            ),
        ]);
    }
}
