// client/src/scene/fx/speed-dust.ts
import * as THREE from 'three';

/**
 * Космическая пыль и микрометеориты: частицы видны только при ускорении камеры.
 * Пыль распределена вокруг камеры в кубе и заворачивается (wrap) при удалении,
 * поэтому работает на любых дистанциях без привязки к конкретному уровню.
 */
export class SpeedDust {
    private readonly points: THREE.Points;
    private readonly positions: Float32Array;
    private readonly velocities: Float32Array;
    private readonly material: THREE.PointsMaterial;
    private readonly count: number;
    private readonly halfExtent: number;
    /** Текущая скорость камеры (юнитов/сек), обновляется извне. */
    public intensity = 0;
    /** TEMP-тумблер панели фильтров: false полностью скрывает пыль. */
    public visible = true;

    public constructor(count = 900, halfExtent = 260) {
        this.count = count;
        this.halfExtent = halfExtent;
        this.positions = new Float32Array(count * 3);
        this.velocities = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            this.positions[i * 3] = (Math.random() - 0.5) * 2 * halfExtent;
            this.positions[i * 3 + 1] = (Math.random() - 0.5) * 2 * halfExtent;
            this.positions[i * 3 + 2] = (Math.random() - 0.5) * 2 * halfExtent;
            // Небольшой собственный дрейф (микрометеориты).
            this.velocities[i * 3] = (Math.random() - 0.5) * 2;
            this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 2;
            this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        let map: THREE.Texture | null = null;
        if (ctx) {
            const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
            g.addColorStop(0, 'rgba(255,255,255,0.9)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 32, 32);
            map = new THREE.CanvasTexture(canvas);
        }

        this.material = new THREE.PointsMaterial({
            size: 0.9,
            map,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            color: 0xbfd4ff,
        });

        this.points = new THREE.Points(geo, this.material);
        this.points.frustumCulled = false;
    }

    public getObject(): THREE.Object3D {
        return this.points;
    }

    /**
     * Обновление: камера движется — пыль остаётся в мировых координатах,
     * но оборачивается в куб вокруг неё. Интенсивность = скорость камеры.
     */
    public update(dt: number, cameraPos: THREE.Vector3): void {
        const he = this.halfExtent;
        const pos = this.positions;

        for (let i = 0; i < this.count; i++) {
            const ix = i * 3;
            pos[ix] = pos[ix]! + this.velocities[ix]! * dt;
            pos[ix + 1] = pos[ix + 1]! + this.velocities[ix + 1]! * dt;
            pos[ix + 2] = pos[ix + 2]! + this.velocities[ix + 2]! * dt;

            // Wrap относительно позиции камеры (центрированный модуль —
            // корректен при любом удалении камеры от частицы).
            for (let a = 0; a < 3; a++) {
                const c = cameraPos.getComponent(a);
                let d = pos[ix + a]! - c;
                d -= Math.floor(d / (2 * he)) * (2 * he);
                if (d > he) d -= 2 * he;
                pos[ix + a] = c + d;
            }
        }

        (this.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
        // Пыль проявляется только на скорости, с мягким плато.
        const target = this.visible ? THREE.MathUtils.smoothstep(this.intensity, 12, 140) : 0;
        this.material.opacity = target * 0.75;
    }

    public dispose(): void {
        this.points.geometry.dispose();
        this.material.map?.dispose();
        this.material.dispose();
    }
}
