<?php

declare(strict_types=1);

// src/Engines/EconomyEngine/Core/Systems/EconomyTickSystem.php

namespace Project\Engines\EconomyEngine\Core\Systems;

use Project\CoreEngine\Contracts\LoggerInterface;
use Project\CoreEngine\Contracts\MathKernelInterface;
use Project\CoreEngine\Contracts\TickSystemInterface;
use Project\CoreEngine\Core\Event;
use Project\CoreEngine\Core\TickContext;

/**
 * Тик-система экономики: начисляет доход каждой зарегистрированной колонии.
 *
 * Доход = baseYield × efficiency (fixed-point, масштаб 1_000_000).
 * Все вычисления детерминированы и используют MathKernel.
 */
final class EconomyTickSystem implements TickSystemInterface
{
    public const NAME = 'economy-tick-system';

    private const TICKS_PER_PAYOUT = 1;

    public function __construct(
        private readonly MathKernelInterface $math,
        private readonly LoggerInterface $logger
    ) {
    }

    public function name(): string
    {
        return self::NAME;
    }

    public function update(TickContext $context): void
    {
        $state = $context->state;

        if ($context->tick % self::TICKS_PER_PAYOUT !== 0) {
            return;
        }

        $prefix = 'economy.colony.';

        foreach ($state->all() as $key => $value) {
            if (!is_string($key) || strncmp($key, $prefix, strlen($prefix)) !== 0) {
                continue;
            }

            if (!is_array($value) || !isset($value['planetSeed'], $value['baseYield'], $value['stored'], $value['efficiency'])) {
                continue;
            }

            $income = $this->math->multiplyByFactor($value['baseYield'], $value['efficiency']);
            $value['stored'] = $this->math->add($value['stored'], $income);
            $state->set($key, $value);
        }

        $context->eventBus->publish(new Event(
            sprintf('resources_produced_%d', $context->tick),
            'ResourcesProduced',
            ['tick' => $context->tick],
            $context->tick
        ));
    }
}
