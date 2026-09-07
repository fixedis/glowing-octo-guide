// client/tests/scene/mortis-galaxy.test.ts
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GalaxyShape } from '../../src/core/galaxy-shape.js';
import { SeedGraph } from '../../src/core/seed-graph.js';
import { MortisGalaxy } from '../../src/scene/fx/mortis-galaxy.js';

function makeGalaxy(seed: number): MortisGalaxy {
    const sg = new SeedGraph();
    const shape = GalaxyShape.create(sg, seed);
    const buildKey = sg.hash('galaxy/' + seed + '/mortis/build');
    return new MortisGalaxy(shape, 60, buildKey);
}

describe('MortisGalaxy (порт MORTIS-9)', () => {
    it('детерминирован: одинаковый seed → одинаковое облако частиц', () => {
        const a = makeGalaxy(666013);
        const b = makeGalaxy(666013);
        const pa = (a.getObject() as THREE.Group).children
            .find((o) => (o as THREE.Points).isPoints) as THREE.Points;
        const pb = (b.getObject() as THREE.Group).children
            .find((o) => (o as THREE.Points).isPoints) as THREE.Points;
        const ga = pa.geometry.getAttribute('position');
        const gb = pb.geometry.getAttribute('position');
        expect(ga.count).toBe(gb.count);
        expect(ga.count).toBeGreaterThan(10000);
        for (let i = 0; i < ga.count; i += 997) {
            expect(ga.getX(i)).toBeCloseTo(gb.getX(i), 5);
            expect(ga.getY(i)).toBeCloseTo(gb.getY(i), 5);
        }
        a.dispose();
        b.dispose();
    });

    it('разный seed → разное облако (рандомная генерация работает)', () => {
        const a = makeGalaxy(1);
        const b = makeGalaxy(2);
        const pa = (a.getObject() as THREE.Group).children
            .find((o) => (o as THREE.Points).isPoints) as THREE.Points;
        const pb = (b.getObject() as THREE.Group).children
            .find((o) => (o as THREE.Points).isPoints) as THREE.Points;
        const ga = pa.geometry.getAttribute('position');
        const gb = pb.geometry.getAttribute('position');
        let diff = 0;
        for (let i = 0; i < Math.min(ga.count, gb.count); i += 313) {
            if (Math.abs(ga.getX(i) - gb.getX(i)) > 1e-4) diff++;
        }
        expect(diff).toBeGreaterThan(0);
        a.dispose();
        b.dispose();
    });

    it('частицы рукавов лежат в плоскости диска XY (копланарны системам PHP)', () => {
        const g = makeGalaxy(777);
        // Первый Points в spinGroup — молодые звёзды рукавов.
        const group = g.getObject() as THREE.Group;
        const spin = group.children[0] as THREE.Group; // spinGroup
        const armStars = spin.children.find(
            (o) => (o as THREE.Points).isPoints,
        ) as THREE.Points | undefined;
        if (!armStars) throw new Error('arm stars Points not found');
        const pos = armStars.geometry.getAttribute('position');
        // Основная масса частиц — тонкий диск XY: |z| << |x|,|y|.
        // Системы PHP генерируются как (x, y, z≈0) — те же оси.
        let flat = 0;
        let total = 0;
        for (let i = 0; i < pos.count; i++) {
            total++;
            if (Math.abs(pos.getZ(i)) < 8) flat++;
        }
        expect(flat / total).toBeGreaterThan(0.95);
        g.dispose();
    });

    it('setOpacity масштабирует все каналы, включая ядро', () => {
        const g = makeGalaxy(5);
        g.setOpacity(0.5);
        expect(g.getOpacity()).toBeCloseTo(0.5, 5);
        const group = g.getObject() as THREE.Group;
        const spin = group.children[0] as THREE.Group;
        const sprite = spin.children.find((o) => (o as THREE.Sprite).isSprite) as THREE.Sprite;
        expect(sprite.material.opacity).toBeLessThan(0.2); // базовые 0.16 * 0.5
        g.setOpacity(1);
        expect(sprite.material.opacity).toBeCloseTo(0.16, 5);
        g.dispose();
    });

    it('update() не двигает диск (вращение остаётся у слоя систем) и не падает без камеры', () => {
        const g = makeGalaxy(9);
        const group = g.getObject() as THREE.Group;
        const spinBefore = (group.children[0] as THREE.Object3D).rotation.y;
        g.update(0.5);
        g.update(0.25);
        expect((group.children[0] as THREE.Object3D).rotation.y).toBe(spinBefore);
        g.dispose();
    });

    it('dispose() чистит сцену', () => {
        const g = makeGalaxy(11);
        const obj = g.getObject();
        g.dispose();
        expect(obj.parent).toBeNull();
        expect(obj.children.length).toBe(0);
    });
});
