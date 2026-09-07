<?php

declare(strict_types=1);

// src/CoreEngine/Core/CommandBus.php

namespace Project\CoreEngine\Core;

use LogicException;
use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\LoggerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Throwable;

final class CommandBus
{
    /**
     * @var array<string, CommandHandlerInterface>
     */
    private array $handlers = [];

    public function __construct(
        private readonly EventBus $eventBus,
        private readonly LoggerInterface $logger
    ) {
    }

    public function register(string $commandType, CommandHandlerInterface $handler): void
    {
        if (isset($this->handlers[$commandType])) {
            throw new LogicException(sprintf(
                'Command handler for command type "%s" is already registered.',
                $commandType
            ));
        }

        $this->handlers[$commandType] = $handler;

        $this->logger->debug('Command handler registered.', [
            'command_type' => $commandType,
            'handler' => $handler::class,
        ]);
    }

    public function dispatch(Command $command, StateInterface $state): CommandResult
    {
        $commandType = $command->type;

        $this->logger->debug('Dispatching command.', [
            'command_id' => $command->id,
            'command_type' => $commandType,
            'actor_id' => $command->actorId,
            'target_id' => $command->targetId,
        ]);

        if (!isset($this->handlers[$commandType])) {
            $this->logger->error('Command handler not found.', [
                'command_id' => $command->id,
                'command_type' => $commandType,
            ]);

            return CommandResult::fail(sprintf(
                'Command handler for command type "%s" is not registered.',
                $commandType
            ));
        }

        try {
            $result = $this->handlers[$commandType]->handle($command, $state);
        } catch (Throwable $exception) {
            $this->logger->error('Command handler threw exception.', [
                'command_id' => $command->id,
                'command_type' => $commandType,
                'error' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
            ]);

            return CommandResult::fail(sprintf(
                'Command handler for command type "%s" failed: %s',
                $commandType,
                $exception->getMessage()
            ));
        }

        if (!$result->success) {
            $this->logger->warning('Command rejected.', [
                'command_id' => $command->id,
                'command_type' => $commandType,
                'error' => $result->errorMessage,
            ]);

            return $result;
        }

        foreach ($result->events as $event) {
            $this->eventBus->publish($event);
        }

        $this->logger->info('Command accepted.', [
            'command_id' => $command->id,
            'command_type' => $commandType,
            'events_count' => count($result->events),
        ]);

        return $result;
    }
}
