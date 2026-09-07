<?php

declare(strict_types=1);

// src/CoreEngine/Core/SystemPipeline.php

namespace Project\CoreEngine\Core;

use Project\CoreEngine\Contracts\LoggerInterface;
use Project\CoreEngine\Contracts\TickSystemInterface;
use RuntimeException;
use Throwable;

final class SystemPipeline
{
    /**
     * @var list<TickSystemInterface>
     */
    private array $systems = [];

    public function __construct(
        private readonly LoggerInterface $logger
    ) {
    }

    public function add(TickSystemInterface $system): void
    {
        $this->systems[] = $system;

        $this->logger->debug('Tick system registered.', [
            'system_name' => $system->name(),
            'system_class' => $system::class,
        ]);
    }

    public function run(TickContext $context): void
    {
        foreach ($this->systems as $system) {
            try {
                $system->update($context);
            } catch (Throwable $exception) {
                $this->logger->error('Tick system failed.', [
                    'tick' => $context->tick,
                    'system_name' => $system->name(),
                    'system_class' => $system::class,
                    'error' => $exception->getMessage(),
                    'file' => $exception->getFile(),
                    'line' => $exception->getLine(),
                ]);

                throw new RuntimeException(sprintf(
                    'Tick system "%s" failed: %s',
                    $system->name(),
                    $exception->getMessage()
                ), 0, $exception);
            }
        }
    }
}
