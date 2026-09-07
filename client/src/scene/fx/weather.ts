// client/src/scene/fx/weather.ts
import * as THREE from 'three';

export type WeatherKind = 'none' | 'rain' | 'snow';

/**
 * Погодные эффекты на поверхности: дождь/снег как частицы в кубе
 * вокруг камеры с wrap-логикой (как SpeedDust, но падающие).
 */
export class Weather {
    private readonly points: THREE.Points;
    private readonly positions: Float32Array;
    private readonly material: THREE.PointsMaterial;
    private readonly count: number;
    private readonly halfExtent: number;
    private readonly fallSpeed: number;
    private kind: WeatherKind = 'none';

    public constructor(count = 1200, halfExtent = 40) {
        this.count = count;
        this.halfExtent = halfExtent;
        // Дождь падает быстрее снега.
        this.fallSpeed = 22;

        this.positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            this.resetParticle(i, new Float32Array(3));
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

        // Мягкая круглая точка.
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        let map: THREE.Texture | null = null;
        if (ctx) {
            const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
            g.addColorStop(0, 'rgba(255,255,255,1)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 16, 16);
            map = new THREE.CanvasTexture(canvas);
        }

        this.material = new THREE.PointsMaterial({
            size: 0.12,
            map,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.NormalBlending,
            color: 0xcfe4ff,
        });

        this.points = new THREE.Points(geo, this.material);
        this.points.frustumCulled = false;
        this.points.visible = false;
    }

    public getObject(): THREE.Object3D {
        return this.points;
    }

    /** Включает тип погоды (none — выключить). */
    public setWeather(kind: WeatherKind): void {
        this.kind = kind;
        this.points.visible = kind !== 'none';
        if (kind === 'snow') {
            this.material.size = 0.2;
            this.material.color.setHex(0xffffff);
        } else if (kind === 'rain') {
            this.material.size = 0.1;
            this.material.color.setHex(0xaaccee);
        }
    }

    public getWeather(): WeatherKind {
        return this.kind;
    }

    public update(dt: number, cameraPos: THREE.Vector3): void {
        if (this.kind === 'none') return;

        const he = this.halfExtent;
        const pos = this.positions;
        const speed = this.kind === 'rain' ? this.fallSpeed : this.fallSpeed * 0.25;

        for (let i = 0; i < this.count; i++) {
            const ix = i * 3;
            // Падение + лёгкий ветер.
            pos[ix + 1] = pos[ix + 1]! - speed * dt;
            pos[ix] = pos[ix]! + Math.sin(pos[ix + 1]! * 0.5) * dt * (this.kind === 'snow' ? 1.5 : 0.3);

            // Wrap по вертикали и горизонтали вокруг камеры.
            for (let a = 0; a < 3; a++) {
                const c = cameraPos.getComponent(a);
                let d = pos[ix + a]! - c;
                d -= Math.floor(d / (2 * he)) * (2 * he);
                if (d > he) d -= 2 * he;
                pos[ix + a] = c + d;
            }
        }
        (this.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
        this.material.opacity = this.kind === 'rain' ? 0.45 : 0.7;
    }

    private resetParticle(i: number, cameraPos: Float32Array): void {
        const he = this.halfExtent;
        this.positions[i * 3] = cameraPos[0]! + (Math.random() - 0.5) * 2 * he;
        this.positions[i * 3 + 1] = cameraPos[1]! + Math.random() * 2 * he;
        this.positions[i * 3 + 2] = cameraPos[2]! + (Math.random() - 0.5) * 2 * he;
    }

    public dispose(): void {
        this.points.geometry.dispose();
        this.material.map?.dispose();
        this.material.dispose();
    }
}
