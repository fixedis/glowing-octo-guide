// client/tests/scene/star-surface.test.ts
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createStarSurface } from '../../src/scene/fx/star-surface.js';

describe('StarSurface (красивые солнца разных типов)', () => {
    it('разные спектральные классы дают разные палитры', () => {
        const a = createStarSurface('O', 1);
        const b = createStarSurface('M', 1);
        const ca = (a.material.uniforms['uMid']!.value as THREE.Color).getHex();
        const cb = (b.material.uniforms['uMid']!.value as THREE.Color).getHex();
        expect(ca).not.toBe(cb);
        // У M вспышки сильнее, чем у O.
        const fo = a.material.uniforms['uFlares']!.value as number;
        const fm = b.material.uniforms['uFlares']!.value as number;
        expect(fm).toBeGreaterThan(fo);
        a.dispose(); b.dispose();
    });

    it('детерминирован сидом: одинаковый класс+seed → одинаковый джиттер', () => {
        const a = createStarSurface('G', 777);
        const b = createStarSurface('G', 777);
        const sa = a.material.uniforms['uCellScale']!.value as number;
        const sb = b.material.uniforms['uCellScale']!.value as number;
        expect(sa).toBe(sb);
        a.dispose(); b.dispose();
    });

    it('update двигает время шейдера', () => {
        const s = createStarSurface('K', 5);
        s.update(2.5);
        expect(s.material.uniforms['uTime']!.value).toBe(2.5);
        s.dispose();
    });
});
