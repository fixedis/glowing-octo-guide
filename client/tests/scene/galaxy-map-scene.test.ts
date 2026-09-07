// client/tests/scene/galaxy-map-scene.test.ts

import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { GalaxyMapScene } from '../../src/scene/galaxy-map-scene.js';
import { SeedGraph } from '../../src/core/seed-graph.js';
import type { ApiResponse, Galaxy } from '../../src/core/types.js';
import { UniverseClient, type GalaxyChunkData } from '../../src/api/universe-client.js';

// Mock GalaxyRenderer to avoid canvas operations in tests.
vi.mock('../../src/scene/galaxy-renderer.js', () => ({
    GalaxyRenderer: vi.fn().mockImplementation(() => ({
        getObject: () => new THREE.Group(),
        setGalaxies: vi.fn(),
        getMeshes: () => [],
        pickGalaxy: () => null,
        dispose: vi.fn(),
    })),
}));

function fakeCamera(x: number, y: number, z: number): THREE.Camera {
    const cam = new THREE.PerspectiveCamera();
    cam.position.set(x, y, z);
    // Смотрим вниз на карту-«пол» (как реальная камера карты вселенной):
    // цель ниже по Y и севернее по Z, иначе фрустум не пересекает y=0.
    cam.lookAt(x, y - 1, z - 1);
    return cam;
}

function makeClient(
    chunkResponses: Map<string, readonly Galaxy[]>,
): UniverseClient {
    const client = new UniverseClient({} as never);
    return Object.assign(client, {
        getGalaxies: async (seed: number, chunk: [number, number, number]): Promise<ApiResponse<GalaxyChunkData>> => {
            const key = `${chunk[0]}|${chunk[1]}|${chunk[2]}`;
            const galaxies = chunkResponses.get(key) ?? [];
            return {
                data: {
                    universeSeed: seed,
                    chunk,
                    galaxies,
                },
                meta: { command: 'GenerateGalaxyChunk', tick: 0 },
            };
        },
        getStarSystems: async () => {
            throw new Error('not used in this test');
        },
        getPlanets: async () => {
            throw new Error('not used in this test');
        },
        getColonyArea: async () => {
            throw new Error('not used in this test');
        },
        placeBuilding: async () => {
            throw new Error('not used in this test');
        },
        demolishBuilding: async (): Promise<never> => {
            throw new Error('not used in this test');
        },
    });
}

describe('GalaxyMapScene', () => {
    it('loads chunks around camera', async () => {
        const chunks = new Map<string, readonly Galaxy[]>();
        chunks.set('0|0|0', [
            { seed: 1, name: 'NGC-1', type: 'spiral', x: 0, y: 0, z: 0, radius: 50 },
        ]);
        const client = makeClient(chunks);
        const scene = new GalaxyMapScene(1, client, new SeedGraph());

        await scene.update(fakeCamera(0, 400, 400));

        expect(scene.getGalaxyCount()).toBeGreaterThanOrEqual(1);
        // Фрустумная загрузка: чанки по краям экрана, не фиксированный куб.
        expect(scene.getLoadedChunkCount()).toBeGreaterThan(0);
        scene.dispose();
    });

    it('keeps distant chunks loaded (unload mechanism removed)', async () => {
        const chunks = new Map<string, readonly Galaxy[]>();
        chunks.set('0|0|0', [
            { seed: 1, name: 'NGC-1', type: 'spiral', x: 0, y: 0, z: 0, radius: 50 },
        ]);
        const client = makeClient(chunks);
        const scene = new GalaxyMapScene(1, client, new SeedGraph());

        await scene.update(fakeCamera(0, 400, 400));
        const afterFirst = scene.getLoadedChunkCount();
        expect(afterFirst).toBeGreaterThan(0);

        // Телепортируем камеру далеко — старые чанки НЕ выгружаются.
        await scene.update(fakeCamera(20000, 400, 400));

        expect(scene.getLoadedChunkCount()).toBeGreaterThanOrEqual(afterFirst);

        scene.dispose();
    });

    it('deduplicates chunk fetches', async () => {
        let fetchCount = 0;
        const client = new UniverseClient({} as never);
        Object.assign(client, {
            getGalaxies: async (): Promise<ApiResponse<GalaxyChunkData>> => {
                fetchCount++;
                return {
                    data: { universeSeed: 1, chunk: [0, 0, 0], galaxies: [] },
                    meta: { command: 'GenerateGalaxyChunk', tick: 0 },
                };
            },
            getStarSystems: async () => {
                throw new Error('not used');
            },
            getPlanets: async () => {
                throw new Error('not used');
            },
            getColonyArea: async () => {
                throw new Error('not used');
            },
            placeBuilding: async () => {
                throw new Error('not used');
            },
            demolishBuilding: async (): Promise<never> => {
                throw new Error('not used');
            },
        });

        const scene = new GalaxyMapScene(1, client, new SeedGraph());

        await scene.update(fakeCamera(0, 400, 400));
        const firstCount = fetchCount;
        await scene.update(fakeCamera(0, 400, 400));
        const secondCount = fetchCount;

        expect(firstCount).toBeGreaterThan(0);
        expect(secondCount).toBe(firstCount); // no re-fetch

        scene.dispose();
    });
});

describe('buildKNearest (regression)', () => {
    it('returns empty for less than 2 galaxies', async () => {
        const { buildKNearest } = await import('../../src/scene/k-nearest.js');
        expect(buildKNearest([], 3)).toEqual([]);
    });

    it('closest pair always connected', async () => {
        const { buildKNearest } = await import('../../src/scene/k-nearest.js');
        const galaxies = [
            { seed: 1, name: 'A', type: 'spiral' as const, x: 0, y: 0, z: 0, radius: 10 },
            { seed: 2, name: 'B', type: 'spiral' as const, x: 1, y: 0, z: 0, radius: 10 },
            { seed: 3, name: 'C', type: 'spiral' as const, x: 1000, y: 0, z: 0, radius: 10 },
        ];
        const edges = buildKNearest(galaxies, 1);
        const has = edges.some(
            (e) => (e.from === 0 && e.to === 1) || (e.from === 1 && e.to === 0),
        );
        expect(has).toBe(true);
    });
});
