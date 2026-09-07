<?php

declare(strict_types=1);

// src/CoreEngine/Contracts/CommandHandlerInterface.php

namespace Project\CoreEngine\Contracts;

use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;

interface CommandHandlerInterface
{
    public function handle(Command $command, StateInterface $state): CommandResult;
}
