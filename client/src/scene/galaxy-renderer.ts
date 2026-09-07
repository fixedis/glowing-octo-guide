// client/src/scene/galaxy-renderer.ts

import * as THREE from 'three';
import { SeedGraph } from '../core/seed-graph.js';
import type { Galaxy } from '../core/types.js';
import { buildKNearest, type Edge } from './k-nearest.js';

const TYPE_COLORS: Record<Galaxy['type'], number> = {
    spiral: 0x9bb0ff,
    elliptical: 0xffd2a1,
    irregular: 0xb8c8e0,
};

/** Цвета нитей тёмной материи: фиолетовый, циановый, слабый белый. */
const FILAMENT_COLORS = [0x8a5cf5, 0x35d8e8, 0x9aa4c8] as const;

interface GalaxyRenderHandle {
    readonly galaxy: Galaxy;
    readonly sprite: THREE.Sprite;
    readonly label: THREE.Sprite;
    /** 0..1 — прогресс плавного появления (fade-in при стриминге чанков). */
    fade: number;
}

const SPRITE_SIZE = 128;

function makeSpiralTexture(ctx: CanvasRenderingContext2D): void {
    const half = SPRITE_SIZE / 2;
    const core = ctx.createRadialGradient(half, half, 0, half, half, half * 0.35);
    core.addColorStop(0, 'rgba(255, 240, 200, 0.9)');
    core.addColorStop(1, 'rgba(255, 240, 200, 0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);

    ctx.save();
    ctx.translate(half, half);
    for (let arm = 0; arm < 2; arm++) {
        ctx.rotate(Math.PI);
        ctx.beginPath();
        for (let t = 0.2; t < 5.2; t += 0.05) {
            const r = 6 + t * 10;
            const x = Math.cos(t) * r;
            const y = Math.sin(t) * r;
            if (t <= 0.25) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.strokeStyle = 'rgba(180, 200, 255, 0.45)';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    ctx.restore();
}

function makeEllipticalTexture(ctx: CanvasRenderingContext2D): void {
    const half = SPRITE_SIZE / 2;
    ctx.save();
    ctx.translate(half, half);
    ctx.scale(1, 0.6);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, half * 0.9);
    g.addColorStop(0, 'rgba(255, 230, 180, 0.95)');
    g.addColorStop(0.5, 'rgba(255, 210, 140, 0.4)');
    g.addColorStop(1, 'rgba(255, 200, 130, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(-half, -half, SPRITE_SIZE, SPRITE_SIZE);
    ctx.restore();
}

function makeIrregularTexture(
    ctx: CanvasRenderingContext2D,
    rng: () => number,
): void {
    const half = SPRITE_SIZE / 2;
    const blobs = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < blobs; i++) {
        const cx = (rng() - 0.5) * half * 0.9;
        const cy = (rng() - 0.5) * half * 0.9;
        const r = half * (0.3 + rng() * 0.35);
        const g = ctx.createRadialGradient(half + cx, half + cy, 0, half + cx, half + cy, r);
        g.addColorStop(0, 'rgba(200, 220, 255, 0.55)');
        g.addColorStop(1, 'rgba(200, 220, 255, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    }
}

function makeGalaxyTexture(
    type: Galaxy['type'],
    rng: () => number,
): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = SPRITE_SIZE;
    canvas.height = SPRITE_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Canvas 2D context unavailable.');
    }
    ctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);

    if (type === 'spiral') {
        makeSpiralTexture(ctx);
    } else if (type === 'elliptical') {
        makeEllipticalTexture(ctx);
    } else {
        makeIrregularTexture(ctx, rng);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/**
 * Рендерит узлы галактик как процедурные спрайты + подписи + k-nearest линии.
 * Обновление ИНКРЕМЕНТАЛЬНОЕ: существующие спрайты не пересоздаются,
 * поэтому стриминг чанков не мерцает.
 */
export class GalaxyRenderer {
    private readonly group = new THREE.Group();
    private readonly handles = new Map<string, GalaxyRenderHandle>();
    private lineMesh: THREE.LineSegments | null = null;
    private readonly lineMaterial: THREE.LineBasicMaterial;
    private globalOpacity = 1;
    private pulseTime = 0;
    private handlesSnapshot: GalaxyRenderHandle[] = [];

    public constructor(private readonly seedGraph: SeedGraph) {
        this.lineMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
    }

    public getObject(): THREE.Object3D {
        return this.group;
    }

    /** Финальная зачистка всех ресурсов (терминальная операция). */
    public dispose(): void {
        for (const handle of this.handles.values()) {
            this.disposeHandle(handle);
        }
        this.handles.clear();
        if (this.lineMesh) {
            this.lineMesh.geometry.dispose();
            this.lineMesh = null;
        }
        this.lineMaterial.dispose();
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]!);
        }
    }

    /**
     * Дифф-обновление набора галактик: новые — добавляются, исчезнувшие —
     * убираются, остальные сохраняют свои спрайты/текстуры как есть.
     */
    public setGalaxies(galaxies: readonly Galaxy[]): void {
        const seen = new Set<string>();

        for (const g of galaxies) {
            const key = String(g.seed);
            seen.add(key);
            if (!this.handles.has(key)) {
                const handle = this.createHandle(g);
                // Новые галактики стартуют прозрачными и проявляются в update().
                handle.fade = 0;
                this.applyOpacity(handle, 0);
                this.handles.set(key, handle);
                this.group.add(handle.sprite);
                this.group.add(handle.label);
            }
        }

        for (const [key, handle] of this.handles) {
            if (!seen.has(key)) {
                this.group.remove(handle.sprite);
                this.group.remove(handle.label);
                this.disposeHandle(handle);
                this.handles.delete(key);
            }
        }

        this.rebuildLines(galaxies);
        this.refreshSnapshot();
    }

    /**
     * Пульс сверхскоплений: узлы медленно «дышат» яркостью (фаза от seed).
     * Вызывается каждый кадр на карте вселенной.
     */
    public update(dt: number): void {
        this.pulseTime += dt;
        const t = this.pulseTime;
        for (const h of this.handlesSnapshot) {
            // Плавное появление новых галактик: fade 0→1 за ~0.5 с
            // (стриминг чанков не должен «выскакивать» резко).
            if (h.fade < 1) {
                h.fade = Math.min(1, h.fade + dt * 2);
                this.applyOpacity(h, this.globalOpacity);
            }
            const mat = h.sprite.material as THREE.SpriteMaterial;
            const base = this.globalOpacity;
            const phase = (h.galaxy.seed % 628) / 100;
            mat.opacity = base * h.fade * (0.82 + 0.18 * Math.sin(t * 1.4 + phase));
        }
    }

    /**
     * Экранный масштаб имён тянется за зумом: при приближении имена растут,
     * но СЛАБЕЕ карты (степенная зависимость 0.35 от дистанции) и упираются
     * в потолок читаемости (юзер: «слабее, чем увеличивается вселенная,
     * не больше чем удобно читать»).
     */
    public updateLabelScales(camPos: THREE.Vector3): void {
        const refDist = 4200; // характерная дистанция обзора карты
        for (const h of this.handlesSnapshot) {
            const g = h.galaxy;
            const d = Math.max(60, Math.hypot(camPos.x - g.x, camPos.y - g.y, camPos.z - g.z));
            const m = Math.min(2.2, Math.max(0.7, Math.pow(refDist / d, 0.35)));
            h.label.scale.set(0.15 * m, 0.019 * m, 1);
        }
    }

    public pickGalaxy(object: THREE.Object3D): Galaxy | null {
        for (const handle of this.handles.values()) {
            if (handle.sprite === object || handle.label === object) {
                return handle.galaxy;
            }
        }
        return null;
    }

    public getMeshes(): THREE.Object3D[] {
        return Array.from(this.handles.values(), (h) => h.sprite);
    }

    /** Общая прозрачность слоя вселенной (для fade литой сцены). */
    public setGlobalOpacity(opacity: number): void {
        const o = Math.max(0, Math.min(1, opacity));
        this.globalOpacity = o;
        for (const handle of this.handles.values()) {
            this.applyOpacity(handle, o);
        }
        this.lineMaterial.opacity = 0.4 * o;
    }

    private applyOpacity(handle: GalaxyRenderHandle, o: number): void {
        (handle.sprite.material as THREE.SpriteMaterial).opacity = o;
        (handle.label.material as THREE.SpriteMaterial).opacity = o;
    }

    private disposeHandle(handle: GalaxyRenderHandle): void {
        (handle.sprite.material as THREE.SpriteMaterial).map?.dispose();
        (handle.sprite.material as THREE.SpriteMaterial).dispose();
        (handle.label.material as THREE.SpriteMaterial).map?.dispose();
        handle.label.material.dispose();
    }

    private createHandle(galaxy: Galaxy): GalaxyRenderHandle {
        const rng = this.seedGraph.rng('galaxy/render/' + galaxy.seed);
        // sizeAttenuation:false => scale трактуется как доля высоты экрана.
        const size = 0.028 + rng() * 0.02;
        const color = TYPE_COLORS[galaxy.type];

        const texture = makeGalaxyTexture(galaxy.type, rng);
        // sizeAttenuation:false => маркер постоянного экранного размера,
        // галактики видны с любой дистанции (карта вселенной).
        const material = new THREE.SpriteMaterial({
            map: texture,
            color,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: false,
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(size, size, 1);
        sprite.frustumCulled = false;
        // Карта-«пол»: x и z из генератора, y ≈ 0 (тонкий слой высоты).
        sprite.position.set(galaxy.x, galaxy.y, galaxy.z);

        const label = this.makeLabel(galaxy.name, galaxy.type);
        label.position.set(galaxy.x, galaxy.y + size * 0.6, galaxy.z);

        return { galaxy, sprite, label, fade: 1 };
    }

    private makeLabel(name: string, type: Galaxy['type']): THREE.Sprite {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Canvas 2D context unavailable.');
        }
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'bold 28px system-ui';
        ctx.fillStyle = '#eaf2ff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, canvas.width / 2, canvas.height / 2 - 8);
        ctx.font = '16px system-ui';
        ctx.fillStyle = '#7f96c0';
        ctx.fillText(type.toUpperCase(), canvas.width / 2, canvas.height / 2 + 16);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            sizeAttenuation: false,
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(0.15, 0.019, 1);
        sprite.frustumCulled = false;
        return sprite;
    }

    /** Перестраивает геометрию линий с цветами нитей тёмной материи (vertexColors). */
    private rebuildLines(galaxies: readonly Galaxy[]): void {
        if (this.lineMesh) {
            this.group.remove(this.lineMesh);
            this.lineMesh.geometry.dispose();
            this.lineMesh = null;
        }

        const edges = buildKNearest(galaxies, 3);
        if (edges.length === 0) {
            return;
        }

        const positions = new Float32Array(edges.length * 6);
        const colors = new Float32Array(edges.length * 6);
        for (let i = 0; i < edges.length; i++) {
            const a = galaxies[edges[i]!.from]!;
            const b = galaxies[edges[i]!.to]!;
            const off = i * 6;
            positions[off] = a.x;
            positions[off + 1] = a.y;
            positions[off + 2] = a.z;
            positions[off + 3] = b.x;
            positions[off + 4] = b.y;
            positions[off + 5] = b.z;

            // Цвет нити детерминирован парой узлов: фиолетовый/циановый/белый.
            const c = new THREE.Color(FILAMENT_COLORS[(a.seed + b.seed) % FILAMENT_COLORS.length]);
            colors[off] = c.r * 0.85;
            colors[off + 1] = c.g * 0.85;
            colors[off + 2] = c.b * 0.85;
            colors[off + 3] = c.r;
            colors[off + 4] = c.g;
            colors[off + 5] = c.b;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.lineMesh = new THREE.LineSegments(geometry, this.lineMaterial);
        this.lineMesh.renderOrder = -1;
        this.group.add(this.lineMesh);
    }

    private refreshSnapshot(): void {
        this.handlesSnapshot = Array.from(this.handles.values());
    }
}
