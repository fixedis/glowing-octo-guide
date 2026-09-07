// client/src/scene/fx/volumetric-clouds.ts
import * as THREE from 'three';

const CLOUD_VERT = `
varying vec2 vUv;
void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const CLOUD_FRAG = `
uniform sampler2D uMap;
uniform float uOpacity;
uniform vec3 uTint;
varying vec2 vUv;
void main(){
    vec4 texel = texture2D(uMap, vUv);
    gl_FragColor = vec4(uTint, texel.a * uOpacity);
}`;

/**
 * Объёмные облака при входе в атмосферу: стопка billboard-клочьев,
 * размещённых между точкой входа и поверхностью. Камера ФИЗИЧЕСКИ
 * пролетает сквозь слой (облака не следуют за камерой), поэтому
 * создаётся настоящий эффект прохода насквозь.
 */
export class VolumetricClouds {
    private readonly group = new THREE.Group();
    private readonly layers: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }> = [];
    private readonly disposables: Array<{ dispose(): void }> = [];
    private active = false;

    public constructor(
        seedGraphRng: () => number,
        layerCount = 7,
        spread = 3.2,
        radius = PLANET_CLOUD_RADIUS,
    ) {
        const tex = this.makePuffTexture(seedGraphRng);
        this.disposables.push(tex);

        for (let i = 0; i < layerCount; i++) {
            const mat = new THREE.MeshBasicMaterial({
                map: tex,
                transparent: true,
                depthWrite: false,
                opacity: 0,
                side: THREE.DoubleSide,
            });
            const geo = new THREE.PlaneGeometry(radius * (1.6 + seedGraphRng() * 1.4), radius * (0.8 + seedGraphRng() * 0.9));
            this.disposables.push(mat, geo);
            const mesh = new THREE.Mesh(geo, mat);
            // Слои распределены вдоль подлётной оси Z группы.
            mesh.position.set(
                (seedGraphRng() - 0.5) * radius * 1.4,
                (seedGraphRng() - 0.5) * radius * 0.5,
                (i / Math.max(1, layerCount - 1) - 0.5) * spread,
            );
            mesh.rotation.z = seedGraphRng() * Math.PI * 2;
            mesh.renderOrder = 5 + i;
            this.layers.push({ mesh, mat });
            this.group.add(mesh);
        }
        this.group.visible = false;
    }

    public getObject(): THREE.Object3D {
        return this.group;
    }

    /**
     * Активирует облака и ориентирует стопку перпендикулярно вектору подлёта.
     * entryPoint — точка входа в атмосферу, surfaceDir — направление к поверхности.
     */
    public deploy(entryPoint: THREE.Vector3, surfaceDir: THREE.Vector3): void {
        this.group.position.copy(entryPoint);
        const d = surfaceDir.clone().normalize();
        // Ось Z группы вдоль направления полёта.
        this.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
        this.group.visible = true;
        this.active = true;
    }

    /** Прозрачность слоя i по прогрессу пролёта t 0..1. */
    public updateProgress(cameraPos: THREE.Vector3, t: number): void {
        if (!this.active) return;
        // Каждый слой проявляется, когда камера приближается, и гаснет за спиной.
        for (let i = 0; i < this.layers.length; i++) {
            const l = this.layers[i]!;
            const worldZ = this.layerWorldDepth(l.mesh.position.z, t);
            // Слой виден в окне своего прохождения.
            const window = Math.exp(-Math.pow((t - worldZ) * 6, 2));
            l.mat.opacity = window * 0.55;
        }
        void cameraPos;
    }

    public retract(): void {
        this.active = false;
        this.group.visible = false;
        for (const l of this.layers) l.mat.opacity = 0;
    }

    public isActive(): boolean {
        return this.active;
    }

    /** Нормированная глубина слоя 0..1 для окна прозрачности. */
    private layerWorldDepth(localZ: number, _t: number): number {
        void _t;
        return THREE.MathUtils.clamp(localZ / 3.2 + 0.5, 0, 1);
    }

    private makePuffTexture(rng: () => number): THREE.CanvasTexture {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return new THREE.CanvasTexture(canvas);

        ctx.clearRect(0, 0, size, size);
        // Кучево-образный клочок: перекрывающиеся мягкие пятна.
        const puffs = 26;
        for (let i = 0; i < puffs; i++) {
            const cx = size / 2 + (rng() - 0.5) * size * 0.55;
            const cy = size / 2 + (rng() - 0.5) * size * 0.35;
            const r = size * (0.06 + rng() * 0.14);
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            const a = 0.10 + rng() * 0.16;
            g.addColorStop(0, `rgba(255,255,255,${a.toFixed(2)})`);
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        }
        return new THREE.CanvasTexture(canvas);
    }

    public dispose(): void {
        this.retract();
        for (const d of this.disposables) d.dispose();
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]!);
        }
    }
}

const PLANET_CLOUD_RADIUS = 12;
