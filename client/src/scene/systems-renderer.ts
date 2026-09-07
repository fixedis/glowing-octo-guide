// client/src/scene/systems-renderer.ts

import * as THREE from 'three';
import { SeedGraph } from '../core/seed-graph.js';
import type { Route, StarSystem } from '../core/types.js';

// Цвета шариков систем = ДОМИНИРУЮЩИЙ ТОН звезды внутри (LOOKS.mid из
// fx/star-surface.ts), палитра синхронно сдвинута в жёлтый спектр:
// зашёл в голубой шарик — там голубая звезда, в золотой — золотое солнце.
const SPECTRAL_COLORS: Record<StarSystem['spectralType'], number> = {
    O: 0x7d97ff,
    B: 0x99abff,
    A: 0xe2e4fa,
    F: 0xfff5d8,
    G: 0xffd262,
    K: 0xffa83a,
    M: 0xf26828,
};

interface SystemRenderHandle {
    readonly system: StarSystem;
    readonly mesh: THREE.Mesh;
    readonly label: THREE.Sprite;
}

export class SystemsRenderer {
    private readonly group = new THREE.Group();
    private readonly handles: SystemRenderHandle[] = [];
    private routeMesh: THREE.LineSegments | null = null;
    private readonly routeMaterial: THREE.LineBasicMaterial;
    private asteroidMesh: THREE.InstancedMesh | null = null;
    private readonly asteroidMaterial: THREE.MeshBasicMaterial;

    public constructor(private readonly seedGraph: SeedGraph) {
        this.routeMaterial = new THREE.LineBasicMaterial({
            // Стиль нитей карты вселенной: vertexColors — каждая связь свой
            // цвет из палитры (фиолетовый/циан/белый), градиент яркости вдоль
            // линии, аддитивное смешивание.
            vertexColors: true,
            transparent: true,
            opacity: 0.55,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        this.asteroidMaterial = new THREE.MeshBasicMaterial({
            color: 0x8a8a7a,
            transparent: true,
            opacity: 0.7,
            depthWrite: false,
        });
    }

    public getObject(): THREE.Object3D {
        return this.group;
    }

    public dispose(): void {
        for (const h of this.handles) {
            h.mesh.geometry.dispose();
            (h.mesh.material as THREE.Material).dispose();
            (h.label.material as THREE.SpriteMaterial).map?.dispose();
            h.label.material.dispose();
        }
        if (this.routeMesh) {
            this.routeMesh.geometry.dispose();
            this.routeMesh = null;
        }
        if (this.asteroidMesh) {
            this.asteroidMesh.geometry.dispose();
            (this.asteroidMesh.material as THREE.Material).dispose();
            this.asteroidMesh = null;
        }
        this.routeMaterial.dispose();
        this.asteroidMaterial.dispose();
        this.handles.length = 0;
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]!);
        }
    }

    public setSystemsAndRoutes(
        systems: readonly StarSystem[],
        routes: readonly Route[],
    ): void {
        this.dispose();

        for (const s of systems) {
            const handle = this.createSystemHandle(s);
            this.handles.push(handle);
            this.group.add(handle.mesh);
            this.group.add(handle.label);
        }

        this.buildRoutes(routes);
        this.buildAsteroids(systems);
    }

    public pickSystem(object: THREE.Object3D): StarSystem | null {
        for (const h of this.handles) {
            if (h.mesh === object || h.label === object) {
                return h.system;
            }
        }
        return null;
    }

    public getMeshes(): THREE.Object3D[] {
        return this.handles.map((h) => h.mesh);
    }

    /**
     * Мировая позиция системы на карте галактики (для наведения варп-перехода).
     * null — система не найдена среди отрисованных.
     */
    public findSystemWorldPosition(seed: number): THREE.Vector3 | null {
        for (const h of this.handles) {
            if (h.system.seed === seed) {
                return h.mesh.getWorldPosition(new THREE.Vector3());
            }
        }
        return null;
    }

    /**
     * Прячет/показывает ЛЕЙБЛ конкретной системы (спрайт с именем).
     * При финальной близости перелёта спрайт 4x0.75 у лица выглядит
     * квадратом — юзер просил убрать.
     */
    public setSystemLabelVisible(seed: number, visible: boolean): void {
        for (const h of this.handles) {
            if (h.system.seed === seed) {
                h.label.visible = visible;
            }
        }
    }

    public setGlobalOpacity(opacity: number): void {
        const o = Math.max(0, Math.min(1, opacity));

        for (const h of this.handles) {
            (h.mesh.material as THREE.MeshBasicMaterial).opacity = o;
            (h.label.material as THREE.SpriteMaterial).opacity = o;
        }

        this.routeMaterial.opacity = 0.5 * o;
        this.asteroidMaterial.opacity = 0.7 * o;
    }

    /**
     * Экранный масштаб имён: база читаемая на любом зуме (sizeAttenuation
     * false), при приближении имена мягко подрастают до потолка 1.6x.
     */
    public updateLabelScales(camPos: THREE.Vector3): void {
        const refDist = 190; // характерная дистанция обзора карты галактики
        for (const h of this.handles) {
            const s = h.system;
            const d = Math.max(8, Math.hypot(camPos.x - s.x, camPos.y - s.y, camPos.z - s.z));
            const m = Math.min(1.6, Math.max(1.0, Math.pow(refDist / d, 0.3)));
            h.label.scale.set(0.105 * m, 0.02 * m, 1);
        }
    }

    private createSystemHandle(system: StarSystem): SystemRenderHandle {
        const rng = this.seedGraph.rng('system/render/' + system.seed);
        const size = 0.4 + rng() * 0.3;
        const color = SPECTRAL_COLORS[system.spectralType];

        const geometry = new THREE.SphereGeometry(size, 12, 8);
        // depthWrite:false ОБЯЗАТЕЛЕН: на дальнем зуме суб-пиксельная сфера
        // записывает глубину и выкалывает чёрные точки из аддитивных частиц
        // рукавов за собой (эффект «чёрной россыпи» вдоль рукавов).
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            depthWrite: false,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(system.x, system.y, system.z);

        const label = this.makeLabel(system.name, system.spectralType);
        label.position.set(system.x, system.y + size + 0.3, system.z);

        return { system, mesh, label };
    }

    private makeLabel(name: string, spectral: StarSystem['spectralType']): THREE.Sprite {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Canvas 2D context unavailable.');
        }
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'bold 22px system-ui';
        ctx.fillStyle = '#eaf2ff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, canvas.width / 2, canvas.height / 2 - 4);
        ctx.font = '14px system-ui';
        ctx.fillStyle = '#7f96c0';
        ctx.fillText(spectral + '-class', canvas.width / 2, canvas.height / 2 + 12);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            // ЭКРАННЫЙ размер: имя читается при ЛЮБОМ зуме, включая полный
            // обзор галактики (мировые 4x0.75 юнита с дистанции ~700 давали
            // ~3px — «такие мелкие»).
            sizeAttenuation: false,
        });
        const sprite = new THREE.Sprite(material);
        // Доли высоты экрана; аспект канваса 256x48 сохранён. База чуть
        // крупнее (юзер: «чуть больше текст/имена»).
        sprite.scale.set(0.105, 0.02, 1);
        return sprite;
    }

    private buildRoutes(routes: readonly Route[]): void {
        if (routes.length === 0) {
            return;
        }

        let segmentCount = 0;
        for (const route of routes) {
            segmentCount += Math.max(0, route.points.length - 1);
        }

        const positions = new Float32Array(segmentCount * 6);
        // Палитра нитей карты вселенной: фиолетовый / циан / слабый белый.
        const FILAMENT = [0x8a5cf5, 0x35d8e8, 0x9aa4c8] as const;
        const colors = new Float32Array(segmentCount * 6);
        const col = new THREE.Color();
        let offset = 0;

        for (const route of routes) {
            // Цвет связи детерминирован парой концов — как у нитей вселенной.
            col.setHex(FILAMENT[(route.from + route.to) % FILAMENT.length] ?? FILAMENT[0]!);
            for (let i = 0; i < route.points.length - 1; i++) {
                const a = route.points[i]!;
                const b = route.points[i + 1]!;
                positions[offset] = a.x;
                positions[offset + 1] = a.y;
                positions[offset + 2] = a.z;
                positions[offset + 3] = b.x;
                positions[offset + 4] = b.y;
                positions[offset + 5] = b.z;
                // Градиент яркости вдоль линии 0.85 -> 1.0.
                colors[offset] = col.r * 0.85;
                colors[offset + 1] = col.g * 0.85;
                colors[offset + 2] = col.b * 0.85;
                colors[offset + 3] = col.r;
                colors[offset + 4] = col.g;
                colors[offset + 5] = col.b;
                offset += 6;
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.routeMesh = new THREE.LineSegments(geometry, this.routeMaterial);
        this.routeMesh.renderOrder = -1;
        this.group.add(this.routeMesh);
    }

    private buildAsteroids(systems: readonly StarSystem[]): void {
        const rng = this.seedGraph.rng('galaxy/asteroids');
        const count = 30 + Math.floor(rng() * 40);
        const geometry = new THREE.IcosahedronGeometry(0.15, 0);
        this.asteroidMesh = new THREE.InstancedMesh(
            geometry,
            this.asteroidMaterial,
            count,
        );

        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();

        const minX = systems.reduce((m, s) => Math.min(m, s.x), 0) - 10;
        const maxX = systems.reduce((m, s) => Math.max(m, s.x), 0) + 10;
        const minZ = systems.reduce((m, s) => Math.min(m, s.z), 0) - 10;
        const maxZ = systems.reduce((m, s) => Math.max(m, s.z), 0) + 10;

        for (let i = 0; i < count; i++) {
            position.set(
                minX + rng() * (maxX - minX),
                (rng() - 0.5) * 4,
                minZ + rng() * (maxZ - minZ),
            );
            quaternion.setFromEuler(new THREE.Euler(
                rng() * Math.PI * 2,
                rng() * Math.PI * 2,
                rng() * Math.PI * 2,
            ));
            const s = 0.6 + rng() * 0.8;
            scale.set(s, s, s);
            matrix.compose(position, quaternion, scale);
            this.asteroidMesh.setMatrixAt(i, matrix);
        }

        this.asteroidMesh.instanceMatrix.needsUpdate = true;
        this.group.add(this.asteroidMesh);
    }
}
