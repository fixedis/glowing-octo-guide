// client/tests/core/seed-graph.test.ts

import { describe, expect, it } from 'vitest';
import { SeedGraph } from '../../src/core/seed-graph.js';

// Тестовые векторы из tools/seed-vectors.php.
// Они ДОЛЖНЫ совпадать с PHP-реализацией SeedGraph.
const VECTORS = {
    hash: {
        empty: 2166136261,
        a: 3826002220,
        '1|0|0|0': 460366352,
        'universe/chunk': 2073859624,
    } as const satisfies Record<string, number>,
    mulberry32: {
        seed1: [
            0.6270739405881613,
            0.002735721180215478,
            0.5274470399599522,
            0.9810509674716741,
            0.9683778982143849,
        ],
    } as const,
} as const;

describe('SeedGraph', () => {
    it('returns FNV offset basis for empty string', () => {
        const g = new SeedGraph();
        expect(g.hash('')).toBe(VECTORS.hash.empty);
    });

    it('matches known vectors', () => {
        const g = new SeedGraph();
        expect(g.hash('a')).toBe(VECTORS.hash.a);
        expect(g.hash('1|0|0|0')).toBe(VECTORS.hash['1|0|0|0']);
        expect(g.hash('universe/chunk')).toBe(VECTORS.hash['universe/chunk']);
    });

    it('is deterministic', () => {
        const g = new SeedGraph();
        for (let i = 0; i < 50; i++) {
            const path = `path/${i}`;
            expect(g.hash(path)).toBe(g.hash(path));
        }
    });

    it('hashInts joins with pipe', () => {
        const g = new SeedGraph();
        expect(g.hashInts(1, 0, 0, 0)).toBe(g.hash('1|0|0|0'));
    });

    it('rng is deterministic and in [0,1)', () => {
        const g = new SeedGraph();
        const first = g.rng('universe/chunk');
        const second = g.rng('universe/chunk');
        for (let i = 0; i < 100; i++) {
            const a = first();
            const b = second();
            expect(a).toBe(b);
            expect(a).toBeGreaterThanOrEqual(0);
            expect(a).toBeLessThan(1);
        }
    });

    it('mulberry32 matches known sequence for seed=1', () => {
        const rng = SeedGraph.mulberry32(1);
        const values = Array.from({ length: 5 }, () => rng());
        for (let i = 0; i < 5; i++) {
            expect(values[i]).toBeCloseTo(VECTORS.mulberry32.seed1[i]!, 12);
        }
    });

    it('different paths produce different sequences', () => {
        const g = new SeedGraph();
        const a = g.rng('a')();
        const b = g.rng('b')();
        expect(a).not.toBe(b);
    });
});
