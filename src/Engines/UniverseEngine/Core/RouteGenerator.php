<?php

declare(strict_types=1);

// src/Engines/UniverseEngine/Core/RouteGenerator.php

namespace Project\Engines\UniverseEngine\Core;

use Project\Engines\UniverseEngine\Entities\Systems\StarSystem;

/**
 * Строит граф маршрутов: евклидово MST (гарантированно без пересечений,
 * структура "ветки + тупики") + планарные дополнительные связи.
 * Каждая связь рисуется плавной кривой (квадратичная Безье).
 */
final class RouteGenerator
{
    private const CURVE_STEPS = 8;

    public function __construct(
        private readonly SeedGraph $seedGraph
    ) {
    }

    /**
     * @param list<StarSystem> $systems
     *
     * @return list<array{from: int, to: int, points: list<array{x: int, y: int, z: int}>}>
     */
    public function generate(int $galaxySeed, array $systems): array
    {
        $count = count($systems);

        if ($count < 2) {
            return [];
        }

        $edges = $this->minimumSpanningTree($systems);
        $edges = $this->addPlanarExtras($galaxySeed, $systems, $edges);

        return $this->buildCurves($galaxySeed, $systems, $edges);
    }

    /**
     * Prim: евклидово MST на плоскости (x, y). Не имеет пересечений.
     *
     * @param list<StarSystem> $systems
     *
     * @return list<array{0: int, 1: int}>
     */
    private function minimumSpanningTree(array $systems): array
    {
        $count = count($systems);
        $inTree = array_fill(0, $count, false);
        $inTree[0] = true;

        $edges = [];

        for ($step = 1; $step < $count; $step++) {
            $bestA = -1;
            $bestB = -1;
            $bestDistance = PHP_INT_MAX;

            for ($a = 0; $a < $count; $a++) {
                if (!$inTree[$a]) {
                    continue;
                }

                for ($b = 0; $b < $count; $b++) {
                    if ($inTree[$b]) {
                        continue;
                    }

                    $d = $this->squaredDistance($systems[$a], $systems[$b]);

                    if ($d < $bestDistance) {
                        $bestDistance = $d;
                        $bestA = $a;
                        $bestB = $b;
                    }
                }
            }

            $inTree[$bestB] = true;
            $edges[] = [$bestA, $bestB];
        }

        return $edges;
    }

    /**
     * Ветвистость в стиле Stellaris (гиперсеть): каждая система стремится
     * к нескольким связям. Кандидаты — пары «система → её k ближайших
     * соседей» (короткие рёбра дают естественные «созвездия»), порядок
     * перемешивается seed-ом, планарность сохраняется проверкой пересечений.
     *
     * @param list<StarSystem> $systems
     * @param list<array{0: int, 1: int}> $edges
     *
     * @return list<array{0: int, 1: int}> $edges
     */
    private function addPlanarExtras(int $galaxySeed, array $systems, array $edges): array
    {
        $rng = $this->seedGraph->rng('galaxy/' . $galaxySeed . '/routes');
        $count = count($systems);

        if ($count < 3) {
            return $edges;
        }

        // Плотность гиперсети: 35–65% дополнительных связей поверх MST.
        $extra = (int) ceil($count * (0.35 + $rng() * 0.30));

        $keys = [];
        foreach ($edges as [$a, $b]) {
            $keys[$this->edgeKey($a, $b)] = true;
        }

        // Кандидаты: каждая система -> её 3 ближайших соседа.
        $candidates = [];
        for ($a = 0; $a < $count; $a++) {
            $dists = [];
            for ($b = 0; $b < $count; $b++) {
                if ($a === $b) {
                    continue;
                }
                $dists[$b] = $this->squaredDistance($systems[$a], $systems[$b]);
            }
            asort($dists);
            $taken = 0;
            foreach (array_keys($dists) as $b) {
                if ($taken >= 3) {
                    break;
                }
                $candidates[] = [$a, (int) $b];
                ++$taken;
            }
        }

        // Перемешивание Фишера—Йетса на seed-rng.
        $n = count($candidates);
        for ($i = $n - 1; $i > 0; $i--) {
            $j = (int) floor($rng() * ($i + 1));
            [$candidates[$i], $candidates[$j]] = [$candidates[$j], $candidates[$i]];
        }

        $added = 0;
        foreach ($candidates as [$a, $b]) {
            if ($added >= $extra) {
                break;
            }
            $key = $this->edgeKey($a, $b);
            if (isset($keys[$key])) {
                continue;
            }
            if ($this->crossesAny($systems, $a, $b, $edges)) {
                continue;
            }
            // Цепочки: не больше 2 связей подряд на одной линии —
            // третье почти-коллинеарное звено запрещено, пути остаются
            // интересными (изломанными), без длинных прямых прогонов.
            if (!$this->chainOk($systems, $a, $b, $edges)) {
                continue;
            }
            $keys[$key] = true;
            $edges[] = [$a, $b];
            ++$added;
        }

        return $edges;
    }

    /**
     * Запрет цепочек: новое ребро (a,b) не должно создавать прогон из
     * 3+ почти-коллинеарных звеньев подряд (допуск 8°). Проверяем оба
     * конца: если у a уже есть ребро, продолжающее линию на b — отклон.
     *
     * @param list<StarSystem> $systems
     * @param list<array{0: int, 1: int}> $edges
     */
    private function chainOk(array $systems, int $a, int $b, array $edges): bool
    {
        // У конца a: есть ли сосед c такой, что угол (c,a,b) < 172°?
        foreach ($edges as [$c, $d]) {
            $other = null;
            if ($c === $a) {
                $other = $d;
            } elseif ($d === $a) {
                $other = $c;
            }
            if ($other !== null && $other !== $b) {
                if ($this->angleBetween($systems[$a], $systems[$b], $systems[$other]) > cos(deg2rad(8.0))) {
                    return false;
                }
            }
        }
        // У конца b: аналогично.
        foreach ($edges as [$c, $d]) {
            $other = null;
            if ($c === $b) {
                $other = $d;
            } elseif ($d === $b) {
                $other = $c;
            }
            if ($other !== null && $other !== $a) {
                if ($this->angleBetween($systems[$b], $systems[$a], $systems[$other]) > cos(deg2rad(8.0))) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Косинус угла при вершине $v между лучами на $p1 и $p2
     * (dot / |u||v|; чем ближе к 1, тем острее угол).
     *
     * @param StarSystem $v вершина угла
     */
    private function angleBetween(StarSystem $v, StarSystem $p1, StarSystem $p2): float
    {
        $ux = $p1->x - $v->x;
        $uy = $p1->y - $v->y;
        $vx = $p2->x - $v->x;
        $vy = $p2->y - $v->y;

        $lu = sqrt($ux * $ux + $uy * $uy);
        $lv = sqrt($vx * $vx + $vy * $vy);

        if ($lu < 1e-9 || $lv < 1e-9) {
            return 1.0;
        }

        $cos = ($ux * $vx + $uy * $vy) / ($lu * $lv);

        return max(-1.0, min(1.0, $cos));
    }

    /**
     * @param list<StarSystem> $systems
     * @param list<array{0: int, 1: int}> $edges
     */
    private function crossesAny(array $systems, int $a, int $b, array $edges): bool
    {
        foreach ($edges as [$c, $d]) {
            if ($c === $a || $c === $b || $d === $a || $d === $b) {
                continue;
            }

            if ($this->segmentsCross($systems[$a], $systems[$b], $systems[$c], $systems[$d])) {
                return true;
            }
        }

        return false;
    }

    private function segmentsCross(StarSystem $p1, StarSystem $p2, StarSystem $p3, StarSystem $p4): bool
    {
        $o = static fn (StarSystem $a, StarSystem $b, StarSystem $c): float =>
            ($b->x - $a->x) * ($c->y - $a->y) - ($b->y - $a->y) * ($c->x - $a->x);

        $o1 = $o($p1, $p2, $p3);
        $o2 = $o($p1, $p2, $p4);
        $o3 = $o($p3, $p4, $p1);
        $o4 = $o($p3, $p4, $p2);

        return ($o1 > 0) !== ($o2 > 0) && ($o3 > 0) !== ($o4 > 0);
    }

    /**
     * @param list<StarSystem> $systems
     * @param list<array{0: int, 1: int}> $edges
     *
     * @return list<array{from: int, to: int, points: list<array{x: int, y: int, z: int}>}>
     */
    private function buildCurves(int $galaxySeed, array $systems, array $edges): array
    {
        // ПРЯМЫЕ линии «от системы к системе»: маршрут = ровно 2 точки
        // (начало/конец), никакой интерполяции — самая короткая связь.
        unset($galaxySeed);

        $routes = [];

        foreach ($edges as [$a, $b]) {
            $A = $systems[$a];
            $B = $systems[$b];

            $routes[] = [
                'from' => $A->seed,
                'to' => $B->seed,
                'points' => [
                    ['x' => $A->x, 'y' => $A->y, 'z' => 0],
                    ['x' => $B->x, 'y' => $B->y, 'z' => 0],
                ],
            ];
        }

        return $routes;
    }

    private function squaredDistance(StarSystem $a, StarSystem $b): int
    {
        $dx = $a->x - $b->x;
        $dy = $a->y - $b->y;

        return $dx * $dx + $dy * $dy;
    }

    private function edgeKey(int $a, int $b): string
    {
        return min($a, $b) . '-' . max($a, $b);
    }
}
