// client/tests/scene/star-dust.test.ts
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { StarDust } from '../../src/scene/fx/star-dust.js';

describe('StarDust (окружение системы = небо карты галактики)', () => {
    it('строится без WebGL-контекста и содержит звёзды и туманности', () => {
        const dust = new StarDust(1337);
        const obj = dust.getObject();
        // Точки-звёзды + fbm-полотна туманностей (не спрайты — меши).
        expect(obj.children.length).toBeGreaterThan(1);
        let nebulae = 0;
        obj.traverse((o) => {
            if ((o as THREE.Mesh).isMesh) nebulae++;
        });
        expect(nebulae).toBeGreaterThan(0);
        // Размеры туманностей РАЗНЫЕ (юзер: «размер должен быть разным»).
        const scales = new Set<number>();
        obj.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.isMesh && m.geometry instanceof THREE.PlaneGeometry) {
                scales.add(m.geometry.parameters.width);
            }
        });
        expect(scales.size).toBeGreaterThan(3);
        dust.dispose();
    });

    it('детерминирован: один seed → одинаковое облако позиций', () => {
        const a = new StarDust(424242);
        const b = new StarDust(424242);
        const pa = (a.getObject().children[0]! as unknown as { geometry: { attributes: { position: { array: Float32Array } } } }).geometry.attributes.position.array;
        const pb = (b.getObject().children[0]! as unknown as { geometry: { attributes: { position: { array: Float32Array } } } }).geometry.attributes.position.array;
        expect(pa.length).toBe(pb.length);
        let equal = true;
        for (let i = 0; i < pa.length; i++) {
            if (pa[i] !== pb[i]) { equal = false; break; }
        }
        expect(equal).toBe(true);
        // Разный seed → другое небо.
        const c = new StarDust(777);
        const pc = (c.getObject().children[0]! as unknown as { geometry: { attributes: { position: { array: Float32Array } } } }).geometry.attributes.position.array;
        let differ = false;
        for (let i = 0; i < pc.length; i++) {
            if (pc[i] !== pa[i]) { differ = true; break; }
        }
        expect(differ).toBe(true);
        a.dispose(); b.dispose(); c.dispose();
    });

    it('setOpacity управляет видимостью группы', () => {
        const dust = new StarDust(1);
        dust.setOpacity(0);
        expect(dust.getObject().visible).toBe(false);
        dust.setOpacity(0.5);
        expect(dust.getObject().visible).toBe(true);
        dust.setOpacity(5); // кламп в 1
        expect(dust.getObject().visible).toBe(true);
        dust.dispose();
    });

    it('update копит дрейф и переживает несколько кадров подряд', () => {
        const dust = new StarDust(9);
        dust.update(0);
        dust.update(0.5);
        dust.update(1);
        expect(dust.getObject().rotation.y).toBeGreaterThan(0);
        dust.dispose();
    });
});
