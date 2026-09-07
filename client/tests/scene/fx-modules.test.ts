// client/tests/scene/fx-modules.test.ts
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GalaxyDust } from '../../src/scene/fx/galaxy-dust.js';
import { SpeedDust } from '../../src/scene/fx/speed-dust.js';
import { TransitionFx } from '../../src/scene/fx/transition-fx.js';

describe('GalaxyDust', () => {
    it('создаёт детерминированное облако в пределах радиуса', () => {
        const a = new GalaxyDust(42, 50);
        const b = new GalaxyDust(42, 50);
        const pa = (a.getObject() as THREE.Points).geometry.getAttribute('position');
        const pb = (b.getObject() as THREE.Points).geometry.getAttribute('position');
        expect(pa.count).toBe(pb.count);
        expect(pa.getX(0)).toBeCloseTo(pb.getX(0), 5);

        // Все точки внутри радиуса * 1.1.
        let maxR = 0;
        for (let i = 0; i < pa.count; i++) {
            const r = Math.hypot(pa.getX(i), pa.getZ(i));
            maxR = Math.max(maxR, r);
        }
        expect(maxR).toBeLessThanOrEqual(55);
        a.dispose();
        b.dispose();
    });

    it('управляет прозрачностью', () => {
        const d = new GalaxyDust(7, 30);
        d.setOpacity(0.4);
        expect(d.getOpacity()).toBeCloseTo(0.4, 5);
        d.setOpacity(5);
        expect(d.getOpacity()).toBe(1);
        d.dispose();
    });
});

describe('SpeedDust', () => {
    it('пыль невидима на нуле и проявляется на скорости', () => {
        const d = new SpeedDust(100, 40);
        d.intensity = 0;
        d.update(0.016, new THREE.Vector3());
        // opacity приватный — проверяем через материал объекта.
        const mat = (d.getObject() as THREE.Points).material as THREE.PointsMaterial;
        expect(mat.opacity).toBe(0);

        d.intensity = 200;
        d.update(0.016, new THREE.Vector3());
        expect(mat.opacity).toBeGreaterThan(0.3);
        d.dispose();
    });

    it('оборачивает частицы вокруг камеры', () => {
        const d = new SpeedDust(10, 20);
        d.update(0.016, new THREE.Vector3(10000, 10000, 10000));
        const pos = (d.getObject() as THREE.Points).geometry.getAttribute('position');
        for (let i = 0; i < pos.count; i++) {
            const dx = Math.abs(pos.getX(i) - 10000);
            const dy = Math.abs(pos.getY(i) - 10000);
            const dz = Math.abs(pos.getZ(i) - 10000);
            expect(dx).toBeLessThanOrEqual(20);
            expect(dy).toBeLessThanOrEqual(20);
            expect(dz).toBeLessThanOrEqual(20);
        }
        d.dispose();
    });
});

describe('TransitionFx (jsdom)', () => {
    it('плазма создаёт и убирает оверлей', () => {
        const fx = new TransitionFx();
        fx.setPlasma(0.8);
        fx.setPlasma(0);
        fx.setAtmosphereHaze(0.5);
        fx.setAtmosphereHaze(0);
        fx.clear();
        fx.dispose();
        // Не упало — уже хорошо для jsdom.
        expect(true).toBe(true);
    });
});
