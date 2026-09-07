// client/tests/scene/scene-manager.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SceneManager } from '../../src/scene/scene-manager.js';
import { UniverseClient } from '../../src/api/universe-client.js';
import type { Galaxy, Planet, StarSystem } from '../../src/core/types.js';

function makeClient(systems: readonly StarSystem[] = []): UniverseClient {
    const client = new UniverseClient({} as never);
    return Object.assign(client, {
        getGalaxies: async (seed: number, chunk: [number, number, number]) => ({
            data: { universeSeed: seed, chunk, galaxies: [] },
            meta: { command: 'GenerateGalaxyChunk', tick: 0 },
        }),
        getStarSystems: async (seed: number) => ({
            data: { galaxySeed: seed, systems: [sys], routes: [] },
            meta: { command: 'GenerateStarSystems', tick: 0 },
        }),
        getPlanets: async (seed: number, count: number) => ({
            data: { systemSeed: seed, planets: [planet] },
            meta: { command: 'GeneratePlanets', tick: 0 },
        }),
        getColonyArea: async () => ({
            data: { planetSeed: 1, face: 2, depth: 3, x: 2, y: 2, size: 4, buildings: [] },
            meta: { command: 'GenerateColonyInc', tick: 0 },
        }),
        placeBuilding: async () => {
            throw new Error('not used');
        },
        demolishBuilding: async () => {
            throw new Error('not used');
        },
    });
}

const galaxy: Galaxy = { seed: 1, name: 'NGC-1', type: 'spiral', x: 0, y: 0, z: 0, radius: 50 };
const sys: StarSystem = { seed: 10, name: 'SYS-1', spectralType: 'G', x: 0, y: 0, z: 0, planetCount: 1 };
const planet: Planet = {
    seed: 100,
    index: 0,
    type: 'terran',
    variant: 'earth_like',
    radiusKm: 6371,
    semiMajorAxisAuMilli: 1000,
    eccentricityFixed: 0,
    inclinationFixed: 0,
};

function cam(): THREE.PerspectiveCamera {
    const c = new THREE.PerspectiveCamera();
    c.position.set(0, 200, 800);
    return c;
}

async function settle(m: SceneManager, c: THREE.PerspectiveCamera, steps = 14): Promise<void> {
    for (let i = 0; i < steps; i++) {
        await m.update(c, 1.0);
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
}

describe('SceneManager (литая сцена)', () => {
    let m: SceneManager;
    beforeEach(() => {
        m = new SceneManager(1, makeClient(), {});
    });

    it('одна сцена на всех уровнях', async () => {
        const c = cam();
        const sceneBefore = m.getScene();
        await m.enterGalaxy(galaxy, c);
        await settle(m, c);

        expect(m.getScene()).toBe(sceneBefore);
        expect(m.getCurrentMode()).toBe('galaxy-systems');
        m.dispose();
    });

    it('полный цикл туда-обратно без телепортов', async () => {
        const c = cam();
        await m.enterGalaxy(galaxy, c);
        await settle(m, c);
        expect(m.getCurrentMode()).toBe('galaxy-systems');

        await m.enterSystem(sys, c);
        await settle(m, c);
        expect(m.getCurrentMode()).toBe('star-system');

        // Сцена системы сейчас пустая (только солнце) — переход на планету
        // временно отключён. Цикл: вселенная → галактика → система → назад.

        // Возврат работает на каждом уровне.
        m.returnToGalaxy(c);
        await settle(m, c);
        expect(m.getCurrentMode()).toBe('galaxy-systems');

        m.returnToUniverseMap(c);
        await settle(m, c);
        expect(m.getCurrentMode()).toBe('universe-map');
        m.dispose();
    });
});
