// client/tests/scene/surface-noise.test.ts
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { fbm, findLandDirection, terrainHeight } from '../../src/scene/surface-noise.js';

describe('surface-noise (CPU копия шейдера)', () => {
    const seed = new THREE.Vector3(3.1, 7.7, 1.3);

    it('fbm детерминирован', () => {
        expect(fbm(1.5, 2.5, 3.5, 5)).toBe(fbm(1.5, 2.5, 3.5, 5));
    });

    it('terrainHeight в диапазоне [0,1.2]', () => {
        for (let i = 0; i < 20; i++) {
            const d = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5,
            ).normalize();
            const h = terrainHeight(d, seed);
            expect(h).toBeGreaterThanOrEqual(0);
            expect(h).toBeLessThanOrEqual(1.2);
        }
    });

    it('findLandDirection находит сушу, обращённую к звезде', () => {
        const toStar = new THREE.Vector3(1, 0, 0);
        const dir = findLandDirection(seed, 0.45, toStar);
        if (dir) {
            expect(dir.dot(toStar)).toBeGreaterThan(0.3);
            expect(terrainHeight(dir, seed)).toBeGreaterThan(0.45);
        } else {
            expect(dir).toBeNull();
        }
    });
});
