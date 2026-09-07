<?php

declare(strict_types=1);

// src/Engines/CombatEngine/Core/Commands/ResolveCombatHandler.php

namespace Project\Engines\CombatEngine\Core\Commands;

use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\DeterministicRandomInterface;
use Project\CoreEngine\Contracts\MathKernelInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\Event;
use Project\Engines\CombatEngine\Entities\CombatBlueprint;

/**
 * Детерминированное разрешение боя между двумя флотами.
 *
 * Замыкает цепочку Economy -> Production -> Fleet -> Combat: берёт два флота
 * из `fleet.{seed}` (созданные FleetEngine), вычисляет их боевую силу по весам
 * юнитов (CombatBlueprint), списывает «боеприпасы» (ammo) из economy.colony.*
 * обоих владельцев (контракт с EconomyEngine — тот же ключ, что у ProductionEngine),
 * и определяет исход детерминированным RNG ядра (DeterministicRandomInterface,
 * scope по бою — rules.md «Числа» п.7). Потери фиксируются в fleet.*.
 *
 * Связь с соседями — только через State (rules.md «Архитектура» п.3):
 * читает/пишет fleet.* и читает/пишет economy.colony.*.stored (общий контракт).
 * Без прямых вызовов чужих движков. Детерминизм: исход зависит только от
 * (seed, tick, scope, весов) — воспроизводим при replay.
 */
final class ResolveCombatHandler implements CommandHandlerInterface
{
    private const FLEET_PREFIX = 'fleet.';
    private const ECONOMY_PREFIX = 'economy.colony.';

    public function __construct(
        private readonly MathKernelInterface $math,
        private readonly DeterministicRandomInterface $random
    ) {
    }

    public function handle(Command $command, StateInterface $state): CommandResult
    {
        $attackerFleetSeed = $command->payload['attackerFleetSeed'] ?? null;
        $defenderFleetSeed = $command->payload['defenderFleetSeed'] ?? null;
        // Опциональный «бюджет боеприпасов» на флот; списывается из economy.colony.*.stored.
        $ammoCost = $command->payload['ammoCost'] ?? null;

        if (!is_int($attackerFleetSeed) || $attackerFleetSeed <= 0) {
            return CommandResult::fail('ResolveCombat requires positive integer "attackerFleetSeed".');
        }

        if (!is_int($defenderFleetSeed) || $defenderFleetSeed <= 0) {
            return CommandResult::fail('ResolveCombat requires positive integer "defenderFleetSeed".');
        }

        $attackerKey = self::FLEET_PREFIX . $attackerFleetSeed;
        $defenderKey = self::FLEET_PREFIX . $defenderFleetSeed;

        if (!$state->has($attackerKey)) {
            return CommandResult::fail(sprintf('Attacker fleet %d does not exist.', $attackerFleetSeed));
        }

        if (!$state->has($defenderKey)) {
            return CommandResult::fail(sprintf('Defender fleet %d does not exist.', $defenderFleetSeed));
        }

        /** @var array<string, mixed> $attacker */
        $attacker = $state->get($attackerKey);
        /** @var array<string, mixed> $defender */
        $defender = $state->get($defenderKey);

        $attackerPower = $this->fleetPower($attacker['units'] ?? []);
        $defenderPower = $this->fleetPower($defender['units'] ?? []);

        // Списание боеприпасов из economy обоих владельцев (контракт с EconomyEngine).
        $ammo = is_int($ammoCost) && $ammoCost > 0 ? $ammoCost : 0;
        if ($ammo > 0) {
            $ammoFail = $this->spendAmmo($state, $attacker, $ammo, 'attacker');
            if ($ammoFail !== null) {
                return $ammoFail;
            }
            $ammoFail = $this->spendAmmo($state, $defender, $ammo, 'defender');
            if ($ammoFail !== null) {
                return $ammoFail;
            }
        }

        // Детерминированный исход: шанс победы атакующего пропорционален его силе.
        $scope = sprintf('combat.%d.%d', $attackerFleetSeed, $defenderFleetSeed);
        $totalPower = $this->math->add($attackerPower, $defenderPower);
        $attackerWins = true;

        if ($totalPower > 0) {
            $winChance = $this->math->divide($attackerPower, $totalPower);
            $attackerWins = $this->random->chance($winChance, $scope);
        } elseif ($attackerPower === 0 && $defenderPower === 0) {
            $attackerWins = $this->random->chance(500_000, $scope);
        }

        $winner = $attackerWins ? $attacker : $defender;
        $loser = $attackerWins ? $defender : $attacker;

        $winnerLosses = $this->applyLosses($winner, CombatBlueprint::WINNER_LOSS_FRACTION);
        $loserLosses = $this->applyLosses($loser, CombatBlueprint::LOSER_LOSS_FRACTION);

        $state->set($attackerKey, $attacker);
        $state->set($defenderKey, $defender);

        $tick = (int) ($state->get('tick', 0));

        return CommandResult::ok([
            new Event(
                sprintf('combat_resolved_%s', $command->id),
                'CombatResolved',
                [
                    'attackerFleetSeed' => $attackerFleetSeed,
                    'defenderFleetSeed' => $defenderFleetSeed,
                    'attackerPower' => $attackerPower,
                    'defenderPower' => $defenderPower,
                    'winner' => $attackerWins ? 'attacker' : 'defender',
                    'winnerUnitLoss' => $winnerLosses,
                    'loserUnitLoss' => $loserLosses,
                    'ammoSpent' => $ammo * 2,
                ],
                $tick
            ),
        ]);
    }

    /**
     * @param array<string, mixed> $units
     */
    private function fleetPower(array $units): int
    {
        $power = 0;
        foreach ($units as $unit) {
            $type = is_array($unit) ? ($unit['type'] ?? 'drone') : 'drone';
            $power += CombatBlueprint::weightOf(is_string($type) ? $type : 'drone');
        }

        return $power;
    }

    /**
     * Списывает боеприпасы из economy.colony.{ownerColonySeed}.stored.
     *
     * @param array<string, mixed> $fleet
     */
    private function spendAmmo(StateInterface $state, array $fleet, int $ammo, string $side): ?CommandResult
    {
        $ownerColonySeed = (int) ($fleet['ownerColonySeed'] ?? 0);
        if ($ownerColonySeed <= 0) {
            return null; // флот без владельца — бой без списания (админ/спавн).
        }

        $economyKey = self::ECONOMY_PREFIX . $ownerColonySeed;
        if (!$state->has($economyKey)) {
            return CommandResult::fail(sprintf(
                'ResolveCombat: %s owner colony %d not registered in economy.',
                $side,
                $ownerColonySeed
            ));
        }

        /** @var array<string, int> $colony */
        $colony = $state->get($economyKey);
        if ($colony['stored'] < $ammo) {
            return CommandResult::fail(sprintf(
                'ResolveCombat: %s colony %d has not enough ammo (need %d, have %d).',
                $side,
                $ownerColonySeed,
                $ammo,
                $colony['stored']
            ));
        }

        $colony['stored'] = $this->math->subtract($colony['stored'], $ammo);
        $state->set($economyKey, $colony);

        return null;
    }

    /**
     * Применяет долю потерь к составу флота (целочисленно).
     *
     * @param array<string, mixed> $fleet
     */
    private function applyLosses(array &$fleet, int $lossFraction): int
    {
        $units = $fleet['units'] ?? [];
        $count = count($units);
        if ($count === 0) {
            return 0;
        }

        $lossCount = $this->math->divide(
            $this->math->multiply($count, $lossFraction),
            MathKernelInterface::DEFAULT_SCALE
        );
        $lossCount = min($lossCount, $count);

        if ($lossCount > 0) {
            $fleet['units'] = array_values(array_slice($units, 0, $count - $lossCount));
        }

        $fleet['lastCombatTick'] = (int) ($fleet['lastCombatTick'] ?? 0);

        return $lossCount;
    }
}
