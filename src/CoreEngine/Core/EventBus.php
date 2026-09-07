<?php

declare(strict_types=1);

// src/CoreEngine/Core/EventBus.php

namespace Project\CoreEngine\Core;

use Project\CoreEngine\Contracts\EventHandlerInterface;
use Project\CoreEngine\Contracts\LoggerInterface;
use Throwable;

final class EventBus
{
    /**
     * @var array<string, list<EventHandlerInterface>>
     */
    private array $handlers = [];

    public function __construct(
        private readonly LoggerInterface $logger
    ) {
    }

    public function subscribe(string $eventType, EventHandlerInterface $handler): void
    {
        $this->handlers[$eventType][] = $handler;

        $this->logger->debug('Event handler subscribed.', [
            'event_type' => $eventType,
            'handler' => $handler::class,
        ]);
    }

    public function publish(Event $event): void
    {
        $eventType = $event->type;
        $handlers = $this->handlers[$eventType] ?? [];

        $this->logger->debug('Publishing event.', [
            'event_id' => $event->id,
            'event_type' => $eventType,
            'tick' => $event->tick,
            'handlers_count' => count($handlers),
        ]);

        foreach ($handlers as $handler) {
            try {
                $handler->handle($event);
            } catch (Throwable $exception) {
                $this->logger->error('Event handler failed.', [
                    'event_id' => $event->id,
                    'event_type' => $eventType,
                    'handler' => $handler::class,
                    'error' => $exception->getMessage(),
                    'file' => $exception->getFile(),
                    'line' => $exception->getLine(),
                ]);
            }
        }
    }
}
