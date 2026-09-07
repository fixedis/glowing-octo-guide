// client/src/scene/galaxy-map-scene.ts

import * as THREE from 'three';
import type { UniverseClient } from '../api/universe-client.js';
import { SeedGraph } from '../core/seed-graph.js';
import type { Galaxy } from '../core/types.js';
import {
    activeChunkKeys,
    chunkKey,
    worldToChunk,
} from './chunk-math.js';
import { GalaxyRenderer } from './galaxy-renderer.js';

const CHUNK_RADIUS = 2;

/**
 * Стриминг карты вселенной: подгружает чанки галактик вокруг камеры
 * и наполняет ОБЩИЙ слой литой сцены (GalaxyRenderer живёт в WorldScene).
 * Собственной THREE.Scene нет — все уровни игры живут в одной сцене.
 */
export class GalaxyMapScene {
    private readonly renderer: GalaxyRenderer;
    private readonly galaxiesByChunk = new Map<string, readonly Galaxy[]>();
    private updating = false;

    /**
     * ФРАКТАЛ: seedSource отдаёт сид для стриминга. По умолчанию —
     * фиксированный сид вселенной; во вложенной карте (внутри системы)
     * провайдер возвращает сид родительской системы => детерминированная
     * «галактика внутри системы» тем же генератором.
     */
    /** Локальные рамки карты: центр и масштаб слоя-владельца (фрактал). */
    private frameOrigin = { x: 0, z: 0 };
    private frameScale = 1;

    public constructor(
        private readonly universeSeed: number,
        private readonly client: UniverseClient,
        seedGraph: SeedGraph,
        renderer?: GalaxyRenderer,
        private readonly seedSource: (universeSeed: number) => number = (s) => s,
    ) {
        // Внешний рендерер (общая литая сцена) переиспользуем как есть.
        this.renderer = renderer ?? new GalaxyRenderer(seedGraph);
    }

    public getRenderer(): GalaxyRenderer {
        return this.renderer;
    }

    public getGalaxyCount(): number {
        let total = 0;
        for (const list of this.galaxiesByChunk.values()) {
            total += list.length;
        }
        return total;
    }

    /** Первая загруженная галактика (для автотеста перелёта). */
    public getFirstGalaxy(): Galaxy | null {
        for (const list of this.galaxiesByChunk.values()) {
            const first = list[0];
            if (first) return first;
        }
        return null;
    }

    public getLoadedChunkCount(): number {
        return this.galaxiesByChunk.size;
    }

    /** Рамка локального мира карты: центр (x,z) и масштаб слоя-владельца. */
    public setFrame(originX: number, originZ: number, scale: number): void {
        this.frameOrigin = { x: originX, z: originZ };
        this.frameScale = scale || 1;
    }

    public async update(camera: THREE.Camera): Promise<number> {
        if (this.updating) {
            return this.getGalaxyCount();
        }
        // ФРАКТАЛ: камера живёт в мировых координатах, карта — в локальных
        // (слой масштабирован). Переводим позицию в локаль карты.
        let cam: THREE.Camera = camera;
        if (this.frameScale !== 1 ||
            this.frameOrigin.x !== 0 || this.frameOrigin.z !== 0) {
            const clone = camera.clone();
            clone.position.set(
                (camera.position.x - this.frameOrigin.x) / this.frameScale,
                camera.position.y / this.frameScale,
                (camera.position.z - this.frameOrigin.z) / this.frameScale,
            );
            cam = clone;
        }

        this.updating = true;

        try {
            // Чанки грузятся вокруг ТОГО, ЧТО ВИДИТ ИГРОК: пересечение
            // фрустума камеры с плоскостью карты (z=0), а не куб вокруг
            // позиции камеры («псевдоэкран» больше не расходится с экраном).
            const view = this.visibleMapRect(cam);
            if (!view) {
                return this.getGalaxyCount();
            }
            // Клиент шлёт чанк как (cx=X, cy=Z): X из minX..maxX, Z из minZ..maxZ.
            const cMin = worldToChunk(view.minX, view.minZ, 0);
            const cMax = worldToChunk(view.maxX, view.maxZ, 0);

            const wantedKeys = new Set<string>();
            for (let cx = cMin.cx; cx <= cMax.cx; cx++) {
                for (let cy = cMin.cy; cy <= cMax.cy; cy++) {
                    wantedKeys.add(chunkKey({ cx, cy, cz: 0 }));
                }
            }

            let changed = false;

            // Выгрузка чанков ОТКЛЮЧЕНА по требованию: загруженные галактики
            // остаются в сцене навсегда (карта только накапливается).
            // Загрузка — ПАРАЛЛЕЛЬНО одним Promise.all.
            const toLoad: string[] = [];
            for (const key of wantedKeys) {
                if (!this.galaxiesByChunk.has(key)) {
                    toLoad.push(key);
                }
            }
            const loaders = toLoad.map(async (key) => {
                const [sx, sy, sz] = key.split('|');
                if (sx === undefined || sy === undefined || sz === undefined) {
                    return [key, [] as readonly Galaxy[]] as const;
                }
                const galaxies = await this.loadChunk(
                    Number(sx),
                    Number(sy),
                    Number(sz),
                );
                return [key, galaxies] as const;
            });
            const settled = await Promise.all(loaders);
            for (const [key, galaxies] of settled) {
                this.galaxiesByChunk.set(key, galaxies);
                changed = true;
            }

            if (changed) {
                const all: Galaxy[] = [];
                for (const list of this.galaxiesByChunk.values()) {
                    for (const galaxy of list) {
                        all.push(galaxy);
                    }
                }
                try {
                    this.renderer.setGalaxies(all);
                } catch (e) {
                    console.error('setGalaxies failed:', e);
                    const d = document.createElement('div');
                    d.style.cssText = 'position:fixed;top:150px;left:8px;font:10px monospace;color:#ff7b7b;z-index:9;white-space:pre;';
                    d.textContent = 'setGalaxies: ' + String(e).slice(0, 300);
                    document.body.appendChild(d);
                    throw e;
                }
            }

            return this.getGalaxyCount();
        } finally {
            this.updating = false;
        }
    }

    public dispose(): void {
        this.renderer.dispose();
    }

    /**
     * Прямоугольник карты (плоскость y=0, «пол»), видимый игроку:
     * пересечение фрустума камеры с плоскостью. Это и есть «экран
     * загрузки» — чанки грузятся ровно по координатам краёв экрана.
     */
    private visibleMapRect(
        camera: THREE.Camera,
    ): { minX: number; maxX: number; minZ: number; maxZ: number } | null {
        const cam = camera as THREE.PerspectiveCamera;
        if (!cam.isPerspectiveCamera) {
            return null;
        }

        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
        // Камера смотрит от карты (вверх) — экран не задевает плоскость.
        if (fwd.y >= -1e-6) {
            return null;
        }
        const t = -cam.position.y / fwd.y;
        if (!Number.isFinite(t) || t <= 0) {
            return null;
        }

        // 4 угла фрустума на дистанции t → точки на плоскости карты.
        const halfV = Math.tan((cam.fov * Math.PI) / 360);
        const halfH = halfV * cam.aspect;
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);

        let minX = Infinity;
        let maxX = -Infinity;
        let minZ = Infinity;
        let maxZ = -Infinity;
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
            const dir = fwd.clone()
                .addScaledVector(right, sx * halfH)
                .addScaledVector(up, sy * halfV)
                .normalize();
            const k = -cam.position.y / dir.y;
            if (!Number.isFinite(k) || k <= 0) {
                return null;
            }
            const hitX = cam.position.x + dir.x * k;
            const hitZ = cam.position.z + dir.z * k;
            minX = Math.min(minX, hitX);
            maxX = Math.max(maxX, hitX);
            minZ = Math.min(minZ, hitZ);
            maxZ = Math.max(maxZ, hitZ);
        }

        return { minX, maxX, minZ, maxZ };
    }

    private async loadChunk(
        cx: number,
        cy: number,
        cz: number,
    ): Promise<readonly Galaxy[]> {
        const response = await this.client.getGalaxies(
            this.seedSource(this.universeSeed), [cx, cy, cz]);
        return response.data.galaxies;
    }
}
