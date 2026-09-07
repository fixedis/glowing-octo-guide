// client/tests/core/galaxy-shape.test.ts
import { describe, expect, it } from 'vitest';
import { GalaxyShape } from '../../src/core/galaxy-shape.js';
import { SeedGraph } from '../../src/core/seed-graph.js';

/** Читалка файла в node-окружении vitest без @types/node (any-мост). */
async function loadNodeFs(): Promise<{ fsSync: any; pathMod: any }> {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const mod: any = await import(/* @vite-ignore */ ('node:' + 'module'));
    const nodeRequire = mod.createRequire(import.meta.url);
    return { fsSync: nodeRequire('node:fs'), pathMod: nodeRequire('node:path') };
}

describe('GalaxyShape (детерминированная форма MORTIS-спирали)', () => {
    it('один seed → одна и та же форма', () => {
        const sg = new SeedGraph();
        const a = GalaxyShape.create(sg, 666013);
        const b = GalaxyShape.create(sg, 666013);
        expect(a.toJSON()).toEqual(b.toJSON());
    });

    it('разные seed → разные формы (рандомизация работает)', () => {
        const sg = new SeedGraph();
        const seen = new Set<string>();
        for (let s = 1; s <= 30; s++) {
            seen.add(JSON.stringify(GalaxyShape.create(sg, s * 7919).toJSON()));
        }
        // Из 30 галактик формы обязаны различаться.
        expect(seen.size).toBeGreaterThan(20);
    });

    it('arms в диапазоне 1..5, twist в диапазоне 0.02..0.30', () => {
        const sg = new SeedGraph();
        for (let s = 1; s <= 50; s++) {
            const shape = GalaxyShape.create(sg, s);
            expect(shape.arms).toBeGreaterThanOrEqual(1);
            expect(shape.arms).toBeLessThanOrEqual(5);
            expect(shape.twist).toBeGreaterThanOrEqual(0.02);
            expect(shape.twist).toBeLessThanOrEqual(0.3);
            expect([1, -1]).toContain(shape.spinSign);
            // Диск всегда «вкручивается» (знак из геометрии твикла),
            // а мини-воронка имеет САМОСТОЯТЕЛЬНЫЙ знак.
            expect(Math.sign(shape.vortexSpin)).not.toBe(0);
        }
    });

    it('armAngle согласован с armCenterOffset/armWidth (кривая рукава непрерывна)', () => {
        const sg = new SeedGraph();
        const shape = GalaxyShape.create(sg, 42);
        const arm = 0;
        let prev = shape.armAngle(4, arm, shape.armCenterOffset(4, arm));
        for (let r = 5; r < 60; r += 0.5) {
            const a = shape.armAngle(r, arm, shape.armCenterOffset(r, arm));
            // Соседние точки осевой линии не прыгают больше чем на 0.5 рад.
            expect(Math.abs(a - prev)).toBeLessThan(0.5);
            prev = a;
        }
    });

    it('кросс-платформа: значения совпадают с PHP SeedGraph/GalaxyShape', async () => {
        const sg = new SeedGraph();
        const shape = GalaxyShape.create(sg, 666013);
        const { fsSync, pathMod } = await loadNodeFs();
        // cwd может быть client/ или корень — пробуем оба варианта.
        let fixturePath: string = pathMod.resolve('tests', 'fixtures', 'galaxy-shape-666013.json');
        if (!fsSync.existsSync(fixturePath)) {
            fixturePath = pathMod.resolve('..', 'tests', 'fixtures', 'galaxy-shape-666013.json');
        }
        if (!fsSync.existsSync(fixturePath)) {
            throw new Error(`Fixture missing (${fixturePath}): run tools/export-galaxy-shape-fixture.php`);
        }
        const expected = JSON.parse(fsSync.readFileSync(fixturePath, 'utf8')) as Record<string, number>;
        expect(shape.toJSON()).toEqual(expected);
    });
});
