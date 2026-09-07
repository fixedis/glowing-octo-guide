<?php

declare(strict_types=1);

// src/CoreEngine/Contracts/EventHandlerInterface.php

namespace Project\CoreEngine\Contracts;

use Project\CoreEngine\Core\Event;

interface EventHandlerInterface
{
    public function handle(Event $event): void;
}
