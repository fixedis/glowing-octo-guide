<?php

declare(strict_types=1);

// src/Engines/CombatEngine/CombatEngine.php

namespace Project\Engines\CombatEngine;

use Project\CoreEngine\Contracts\RegistrableEngineInterface;
use Project\CoreEngine\Core\CoreServices;
use Project\CoreEngine\Core\EngineRegistration;
use Project\Engines\CombatEngine\Core\Commands\ResolveCombatHandler;

/**
 * CombatEngine — доменный движок боя флотов.
 *
 * Финал цепочки Economy -> Production -> Fleet -> Combat. Разрешает бой между
 * двумя флотами (fleet.*): вычисляет силу по весам юнитов, списывает боеприпасы
 * из economy.colony.*.stored (контракт с EconomyEngine, как у ProductionEngine),
 * определяет исход детерминированным RNG ядра и фиксирует потери в fleet.*.
 *
 * Ответственность чётко отделена (rules.md «Движки» п.4): спавн/перемещение —
 * не наша зона; CombatEngine только разрешает бой и пишет результат. Связь с
 * соседями — только через State-контракт (rules.md «Архитектура» п.3).
 *
 * Детерминизм: исход зависит только от (seed, tick, scope, весов) — повторяем
 * при replay (rules.md «Числа» п.5/7, RNG ядра, не свой).
 */
final class CombatEngine implements RegistrableEngineInterface
{
    public function id(): string
    {
        return 'combat-engine';
    }

    public function version(): string
    {
        return '0.1.0';
    }

    public function register(EngineRegistration $registration, CoreServices $services): void
    {
        $registration->commandHandler('ResolveCombat', new ResolveCombatHandler(
            $services->math,
            $services->random
        ));

        $services->logger->info('CombatEngine registered.', [
            'version' => $this->version(),
        ]);
    }

    public function boot(): void
    {
    }

    public function shutdown(): void
    {
    }
}
