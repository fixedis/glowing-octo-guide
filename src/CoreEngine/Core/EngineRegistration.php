<?php

declare(strict_types=1);

// src/CoreEngine/Core/EngineRegistration.php

namespace Project\CoreEngine\Core;

use InvalidArgumentException;
use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\EventHandlerInterface;
use Project\CoreEngine\Contracts\LoggerInterface;
use Project\CoreEngine\Contracts\TickSystemInterface;
use RuntimeException;
use Throwable;

final class EngineRegistration
{
    /**
     * @var list<string>
     */
    private array $commandTypes = [];

    /**
     * @var list<string>
     */
    private array $eventTypes = [];

    /**
     * @var list<string>
     */
    private array $systemNames = [];

    public function __construct(
        private readonly string $engineId,
        private readonly CommandBus $commandBus,
        private readonly EventBus $eventBus,
        private readonly SystemPipeline $systemPipeline,
        private readonly LoggerInterface $logger
    ) {
    }

    public function engineId(): string
    {
        return $this->engineId;
    }

    public function commandHandler(string $commandType, CommandHandlerInterface $handler): void
    {
        $commandType = trim($commandType);

        if ($commandType === '') {
            throw new InvalidArgumentException(sprintf(
                'Engine "%s" tried to register an empty command type.',
                $this->engineId
            ));
        }

        try {
            $this->commandBus->register($commandType, $handler);
        } catch (Throwable $exception) {
            $this->logger->error('Engine failed to register command handler.', [
                'engine_id' => $this->engineId,
                'command_type' => $commandType,
                'handler' => $handler::class,
                'error' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
            ]);

            throw new RuntimeException(sprintf(
                'Engine "%s" failed to register command handler for command type "%s": %s',
                $this->engineId,
                $commandType,
                $exception->getMessage()
            ), 0, $exception);
        }

        $this->commandTypes[] = $commandType;

        $this->logger->info('Engine registered command handler.', [
            'engine_id' => $this->engineId,
            'command_type' => $commandType,
            'handler' => $handler::class,
        ]);
    }

    public function eventHandler(string $eventType, EventHandlerInterface $handler): void
    {
        $eventType = trim($eventType);

        if ($eventType === '') {
            throw new InvalidArgumentException(sprintf(
                'Engine "%s" tried to register an empty event type.',
                $this->engineId
            ));
        }

        try {
            $this->eventBus->subscribe($eventType, $handler);
        } catch (Throwable $exception) {
            $this->logger->error('Engine failed to register event handler.', [
                'engine_id' => $this->engineId,
                'event_type' => $eventType,
                'handler' => $handler::class,
                'error' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
            ]);

            throw new RuntimeException(sprintf(
                'Engine "%s" failed to register event handler for event type "%s": %s',
                $this->engineId,
                $eventType,
                $exception->getMessage()
            ), 0, $exception);
        }

        $this->eventTypes[] = $eventType;

        $this->logger->info('Engine registered event handler.', [
            'engine_id' => $this->engineId,
            'event_type' => $eventType,
            'handler' => $handler::class,
        ]);
    }

    public function system(TickSystemInterface $system): void
    {
        try {
            $this->systemPipeline->add($system);
        } catch (Throwable $exception) {
            $this->logger->error('Engine failed to register tick system.', [
                'engine_id' => $this->engineId,
                'system_name' => $system->name(),
                'system_class' => $system::class,
                'error' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
            ]);

            throw new RuntimeException(sprintf(
                'Engine "%s" failed to register tick system "%s": %s',
                $this->engineId,
                $system->name(),
                $exception->getMessage()
            ), 0, $exception);
        }

        $this->systemNames[] = $system->name();

        $this->logger->info('Engine registered tick system.', [
            'engine_id' => $this->engineId,
            'system_name' => $system->name(),
            'system_class' => $system::class,
        ]);
    }

    /**
     * @return list<string>
     */
    public function registeredCommandTypes(): array
    {
        return array_values($this->commandTypes);
    }

    /**
     * @return list<string>
     */
    public function registeredEventTypes(): array
    {
        return array_values($this->eventTypes);
    }

    /**
     * @return list<string>
     */
    public function registeredSystemNames(): array
    {
        return array_values($this->systemNames);
    }
}
