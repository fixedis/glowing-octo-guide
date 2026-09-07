<?php

declare(strict_types=1);

// tests/Engines/UniverseEngine/RouteGeneratorTest.php

namespace Project\Tests\Engines\UniverseEngine;

use PHPUnit\Framework\TestCase;
use Project\Engines\UniverseEngine\Core\RouteGenerator;
use Project\Engines\UniverseEngine\Core\SeedGraph;
use Project\Engines\UniverseEngine\Entities\Systems\StarSystem;

final class RouteGeneratorTest extends TestCase
{
    private function generator(): RouteGenerator
    {
        return new RouteGenerator(new SeedGraph());
    }

    private function sys(int $seed, int $x, int $y): StarSystem
    {
        return new StarSystem($seed, 'SYS-' . $seed, 'G', $x, $y, 0, 3);
    }

    private function findBySeed(array $systems, int $seed): StarSystem
    {
        foreach ($systems as $s) {
            if ($s->seed === $seed) {
                return $s;
            }
        }
        throw new \RuntimeException('seed not found');
    }

    public function testEmptyForLessThanTwo(): void
    {
        self::assertSame([], $this->generator()->generate(1, []));
        self::assertSame([], $this->generator()->generate(1, [$this->sys(1, 0, 0)]));
    }

    public function testConnectsAllSystems(): void
    {
        $systems = [
            $this->sys(1, 0, 0),
            $this->sys(2, 10, 0),
            $this->sys(3, 20, 5),
            $this->sys(4, 5, 15),
            $this->sys(5, 15, -10),
            $this->sys(6, 30, 0),
        ];

        $routes = $this->generator()->generate(42, $systems);

        // MST даёт минимум n-1 связей.
        self::assertGreaterThanOrEqual(count($systems) - 1, count($routes));
    }

    public function testEndpointsMatchSystemCoords(): void
    {
        $systems = [
            $this->sys(1, 0, 0),
            $this->sys(2, 10, 4),
            $this->sys(3, 20, -6),
        ];

        $routes = $this->generator()->generate(7, $systems);

        foreach ($routes as $route) {
            $from = $this->findBySeed($systems, $route['from']);
            $to = $this->findBySeed($systems, $route['to']);

            $first = $route['points'][0];
            $last = $route['points'][count($route['points']) - 1];

            self::assertSame($from->x, $first['x']);
            self::assertSame($from->y, $first['y']);
            self::assertSame($to->x, $last['x']);
            self::assertSame($to->y, $last['y']);
        }
    }

    public function testNoCrossingsBetweenRoutes(): void
    {
        $systems = [
            $this->sys(1, 0, 0),
            $this->sys(2, 10, 0),
            $this->sys(3, 20, 5),
            $this->sys(4, 5, 15),
            $this->sys(5, 15, -10),
            $this->sys(6, 30, 0),
            $this->sys(7, 12, 8),
        ];

        $routes = $this->generator()->generate(42, $systems);

        $orient = static fn (array $a, array $b, array $c): float =>
            ($b['x'] - $a['x']) * ($c['y'] - $a['y']) - ($b['y'] - $a['y']) * ($c['x'] - $a['x']);

        $seg = static function (array $routes, int $i): array {
            $first = $routes[$i]['points'][0];
            $last = $routes[$i]['points'][count($routes[$i]['points']) - 1];
            return [$first, $last];
        };

        for ($i = 0; $i < count($routes); $i++) {
            for ($j = $i + 1; $j < count($routes); $j++) {
                // Общие вершины допускаются; проверяем только несмежные отрезки.
                $sharesVertex = $routes[$i]['from'] === $routes[$j]['from']
                    || $routes[$i]['from'] === $routes[$j]['to']
                    || $routes[$i]['to'] === $routes[$j]['from']
                    || $routes[$i]['to'] === $routes[$j]['to'];

                if ($sharesVertex) {
                    continue;
                }

                [$p1, $p2] = $seg($routes, $i);
                [$p3, $p4] = $seg($routes, $j);

                $o1 = $orient($p1, $p2, $p3);
                $o2 = $orient($p1, $p2, $p4);
                $o3 = $orient($p3, $p4, $p1);
                $o4 = $orient($p3, $p4, $p2);

                $cross = ($o1 > 0) !== ($o2 > 0) && ($o3 > 0) !== ($o4 > 0);

                self::assertFalse($cross, "routes $i and $j cross");
            }
        }
    }

    public function testRouteIsStraightTwoPointLine(): void
    {
        $systems = [$this->sys(1, 0, 0), $this->sys(2, 20, 10)];

        $routes = $this->generator()->generate(1, $systems);

        // Дизайн: маршрут — прямая «от и до», ровно 2 точки (концы ребра).
        self::assertCount(1, $routes);
        self::assertCount(2, $routes[0]['points']);
        self::assertSame(['x' => 0, 'y' => 0, 'z' => 0], $routes[0]['points'][0]);
        self::assertSame(['x' => 20, 'y' => 10, 'z' => 0], $routes[0]['points'][1]);
    }
}
