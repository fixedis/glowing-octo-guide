// client/src/scene/surface-renderer.ts

import * as THREE from 'three';
import { SeedGraph } from '../core/seed-graph.js';
import type { Building, Planet } from '../core/types.js';

export const PLANET_RADIUS = 10;

const GLSL_NOISE = `
float hash1(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*(p.x+p.z)*(p.y+p.z));}
float vnoise(vec3 p){vec3 i=floor(p),f=fract(p);vec3 u=f*f*(3.0-2.0*f);return mix(mix(mix(hash1(i),hash1(i+vec3(1,0,0)),u.x),mix(hash1(i+vec3(0,1,0)),hash1(i+vec3(1,1,0)),u.x),u.y),mix(mix(hash1(i+vec3(0,0,1)),hash1(i+vec3(1,0,1)),u.x),mix(hash1(i+vec3(0,1,1)),hash1(i+vec3(1,1,1)),u.x),u.y),u.z);}
float fbmN(vec3 p,float oct){float a=.5,s=0.;for(int k=0;k<7;k++){if(float(k)>=oct)break;s+=a*vnoise(p);p=p*2.03+vec3(1.7);a*=.5;}return s;}
`;

const SURFACE_VERT = `
uniform vec3 uSeed;
uniform float uAmp;
varying vec3 vDir;
${GLSL_NOISE}
void main(){
  vec3 n = normalize(position);
  vDir = n;
  float h = fbmN(n*3.0 + uSeed, 5.0);
  vec3 p = position + n * (h - 0.5) * uAmp;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const SURFACE_FRAG = `
uniform vec3 uSeed;
uniform float uSea;
uniform float uLava;
uniform float uIce;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform vec3 uSunDir;
uniform float uCityLights;
varying vec3 vDir;
${GLSL_NOISE}
void main(){
  float h = fbmN(vDir*3.0 + uSeed, 5.0);
  float land = smoothstep(uSea, uSea+0.05, h);
  vec3 col = mix(uColA, uColB, land);
  col = mix(col, uColC, smoothstep(0.6, 0.8, h));
  float ice = smoothstep(0.7, 0.9, abs(vDir.y)) * uIce;
  col = mix(col, vec3(0.95), ice);
  float crack = 1.0 - smoothstep(0.0, 0.05, abs(fbmN(vDir*5.0+uSeed, 4.0) - 0.5));
  col = mix(col, vec3(1.0, 0.3, 0.05), crack * uLava);

  // День/ночь: диффуз от солнца, тёплый терминатор.
  vec3 N = normalize(vDir);
  vec3 S = normalize(uSunDir);
  float ndl = dot(N, S);
  float diff = max(ndl, 0.0);
  float night = smoothstep(0.08, -0.12, ndl);
  // Терминатор: узкая тёплая полоса на границе дня и ночи.
  float term = smoothstep(0.18, 0.02, abs(ndl)) * (1.0 - night);

  vec3 lit = col * (0.04 + 0.96 * diff);
  lit += col * vec3(1.0, 0.55, 0.25) * term * 0.22;

  // Огни городов: пятна fbm только на суше ночной стороны.
  float cities = smoothstep(0.72, 0.9, fbmN(vDir*11.0 + uSeed, 3.0));
  float lightsMask = land * (1.0 - ice) * night * cities * uCityLights;
  vec3 lightColor = vec3(1.0, 0.85, 0.55);
  lit += lightColor * lightsMask * 0.85;

  gl_FragColor = vec4(lit, 1.0);
}`;

function cubeDir(face: number, u: number, v: number, out: THREE.Vector3): THREE.Vector3 {
    const x = u * 2 - 1;
    const y = v * 2 - 1;
    switch (face) {
        case 0: out.set(1, y, -x); break;
        case 1: out.set(-1, y, x); break;
        case 2: out.set(x, 1, -y); break;
        case 3: out.set(x, -1, y); break;
        case 4: out.set(x, y, 1); break;
        default: out.set(-x, y, -1); break;
    }
    return out.normalize();
}

const BUILDING_COLORS: Record<Building['type'], number> = {
    dome: 0x4d9fff,
    extractor: 0xff8c42,
    power: 0xffd166,
    turret: 0xd05050,
    tower: 0xb06ff0,
    landing_pad: 0x8fd0ff,
};

export class SurfaceRenderer {
    private readonly group = new THREE.Group();
    /** Вращающийся слой: рельеф + колония + сетка (день/ночь). */
    private readonly spinGroup = new THREE.Group();
    private readonly disposables: Array<{ dispose(): void }> = [];
    private terrain: THREE.Mesh | null = null;
    private readonly buildingMeshes: THREE.Object3D[] = [];
    private readonly buildingGlows: THREE.Sprite[] = [];
    private grid: THREE.LineSegments | null = null;
    private gridMaterial: THREE.LineBasicMaterial | null = null;

    public constructor(private readonly seedGraph: SeedGraph) {
        this.group.add(this.spinGroup);
    }

    public getObject(): THREE.Object3D {
        return this.group;
    }

    /**
     * Цикл день/ночи: медленное осевое вращение рельефа с колонией.
     * Солнце (uSunDir) фиксировано — терминатор движется по поверхности.
     */
    public update(dt: number): void {
        // Один оборот ~ 8 минут реального времени.
        this.spinGroup.rotation.y += dt * 0.013;
    }

    /** Направление на солнце для шейдера рельефа (терминатор + огни городов). */
    public setSunDirection(dir: THREE.Vector3): void {
        const terrain = this.terrain;
        const mat = terrain?.material as THREE.ShaderMaterial | undefined;
        if (mat?.uniforms && mat.uniforms['uSunDir']) {
            (mat.uniforms['uSunDir'].value as THREE.Vector3).copy(dir).normalize();
        }
    }

    public setPlanet(planet: Planet): void {
        this.clearTerrain();

        const rng = this.seedGraph.rng('planet/surface/' + planet.seed);
        const params = this.surfaceParams(planet, rng);

        const geo = this.track(new THREE.SphereGeometry(PLANET_RADIUS, 96, 64));
        const mat = this.track(new THREE.ShaderMaterial({
            vertexShader: SURFACE_VERT,
            fragmentShader: SURFACE_FRAG,
            uniforms: {
                uSeed: { value: new THREE.Vector3(rng() * 10, rng() * 10, rng() * 10) },
                uAmp: { value: 0.4 },
                uSea: { value: params.sea },
                uLava: { value: params.lava },
                uIce: { value: params.ice },
                uColA: { value: params.colA },
                uColB: { value: params.colB },
                uColC: { value: params.colC },
                uSunDir: { value: new THREE.Vector3(1, 0.3, 0.5) },
                uCityLights: { value: planet.type === 'terran' ? 1 : 0 },
            },
        }));
        this.terrain = new THREE.Mesh(geo, mat);
        this.spinGroup.add(this.terrain);
    }

    public setColony(
        buildings: readonly Building[],
        face: number,
        depth: number,
        x0: number,
        y0: number,
        size: number,
    ): void {
        this.clearColony();

        const up = new THREE.Vector3(0, 1, 0);
        const dir = new THREE.Vector3();

        for (const b of buildings) {
            const cell = 1 / (1 << depth);
            const u = (b.x + 0.5) * cell;
            const v = (b.y + 0.5) * cell;
            cubeDir(face, u, v, dir);

            const mesh = this.makeBuilding(b);
            mesh.position.copy(dir).multiplyScalar(PLANET_RADIUS + 0.05);
            mesh.quaternion.setFromUnitVectors(up, dir);
            this.buildingMeshes.push(mesh);
            this.spinGroup.add(mesh);
        }

        this.buildGrid(face, depth, x0, y0, size);
    }

    public setGlobalOpacity(opacity: number): void {
        const o = Math.max(0, Math.min(1, opacity));
        for (const m of this.buildingMeshes) {
            m.traverse((obj) => {
                const mesh = obj as THREE.Mesh;
                if (mesh.material) {
                    (mesh.material as THREE.Material).opacity = o;
                }
            });
        }
        for (const glow of this.buildingGlows) {
            (glow.material as THREE.SpriteMaterial).opacity = o;
        }
        if (this.gridMaterial) {
            this.gridMaterial.opacity = 0.5 * o;
        }
    }

    public dispose(): void {
        this.clearTerrain();
        this.clearColony();
        for (const d of this.disposables) {
            d.dispose();
        }
        this.disposables.length = 0;
        while (this.spinGroup.children.length > 0) {
            this.spinGroup.remove(this.spinGroup.children[0]!);
        }
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]!);
        }
    }

    private track<T extends { dispose(): void }>(d: T): T {
        this.disposables.push(d);
        return d;
    }

    private clearTerrain(): void {
        if (this.terrain) {
            this.terrain.geometry.dispose();
            (this.terrain.material as THREE.Material).dispose();
            this.spinGroup.remove(this.terrain);
            this.terrain = null;
        }
    }

    private clearColony(): void {
        for (const m of this.buildingMeshes) {
            m.traverse((obj) => {
                const mesh = obj as THREE.Mesh;
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) (mesh.material as THREE.Material).dispose();
            });
            this.spinGroup.remove(m);
        }
        this.buildingMeshes.length = 0;
        for (const glow of this.buildingGlows) {
            (glow.material as THREE.SpriteMaterial).map?.dispose();
            (glow.material as THREE.SpriteMaterial).dispose();
            glow.removeFromParent();
        }
        this.buildingGlows.length = 0;
        if (this.grid) {
            this.grid.geometry.dispose();
            this.spinGroup.remove(this.grid);
            this.grid = null;
        }
    }

    private surfaceParams(planet: Planet, rng: () => number) {
        switch (planet.type) {
            case 'terran':
                return { sea: 0.45, lava: 0, ice: 0.6, colA: new THREE.Color(0x1a4a8a), colB: new THREE.Color(0x4f7f52), colC: new THREE.Color(0x8a7a5a) };
            case 'ice':
                return { sea: 0.3, lava: 0, ice: 1, colA: new THREE.Color(0x9ac8e0), colB: new THREE.Color(0xf2fbff), colC: new THREE.Color(0xffffff) };
            case 'lava':
                return { sea: 0.5, lava: 0.8, ice: 0, colA: new THREE.Color(0x241108), colB: new THREE.Color(0x3a2118), colC: new THREE.Color(0x5a3118) };
            case 'gas':
                return { sea: 0.5, lava: 0, ice: 0, colA: new THREE.Color(0xb4763d), colB: new THREE.Color(0xd0905a), colC: new THREE.Color(0xe0b080) };
            default:
                return { sea: 0.6, lava: 0, ice: 0.3, colA: new THREE.Color(0x6a6a6a), colB: new THREE.Color(0x8a8a8a), colC: new THREE.Color(0xaaaaaa) };
        }
    }

    private makeBuilding(b: Building): THREE.Object3D {
        const color = BUILDING_COLORS[b.type];
        const mat = this.track(new THREE.MeshBasicMaterial({ color, transparent: true }));
        let geo: THREE.BufferGeometry;

        switch (b.type) {
            case 'dome':
                geo = this.track(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2));
                break;
            case 'tower':
                geo = this.track(new THREE.CylinderGeometry(0.1, 0.16, 0.7, 8));
                break;
            case 'turret':
                geo = this.track(new THREE.ConeGeometry(0.14, 0.4, 8));
                break;
            case 'power':
                geo = this.track(new THREE.BoxGeometry(0.3, 0.2, 0.3));
                break;
            case 'landing_pad':
                geo = this.track(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 16));
                break;
            default:
                geo = this.track(new THREE.BoxGeometry(0.2, 0.4, 0.2));
        }

        const mesh = new THREE.Mesh(geo, mat);

        // Локальное освещение: emissive-огонёк на каждом здании колонии.
        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = 32;
        glowCanvas.height = 32;
        const gctx = glowCanvas.getContext('2d');
        if (gctx) {
            const g = gctx.createRadialGradient(16, 16, 0, 16, 16, 16);
            g.addColorStop(0, 'rgba(255,230,170,0.95)');
            g.addColorStop(1, 'rgba(255,200,120,0)');
            gctx.fillStyle = g;
            gctx.fillRect(0, 0, 32, 32);
            const tex = this.track(new THREE.CanvasTexture(glowCanvas));
            const glowMat = this.track(new THREE.SpriteMaterial({
                map: tex,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            }));
            const glow = new THREE.Sprite(glowMat);
            const s = b.type === 'tower' || b.type === 'power' ? 0.55 : 0.35;
            glow.scale.set(s, s, 1);
            // Огни чуть выше геометрии здания.
            glow.position.y = b.type === 'tower' ? 0.45 : 0.2;
            mesh.add(glow);
            this.buildingGlows.push(glow);
        }

        return mesh;
    }

    private buildGrid(face: number, depth: number, x0: number, y0: number, size: number): void {
        const cell = 1 / (1 << depth);
        const positions: number[] = [];
        const dir = new THREE.Vector3();
        const r = PLANET_RADIUS + 0.03;

        const point = (x: number, y: number): THREE.Vector3 => {
            cubeDir(face, x * cell, y * cell, dir);
            return dir.clone().multiplyScalar(r);
        };

        for (let i = 0; i <= size; i++) {
            for (let j = 0; j < size; j++) {
                const a = point(x0 + i, y0 + j);
                const b = point(x0 + i, y0 + j + 1);
                positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
            }
        }
        for (let j = 0; j <= size; j++) {
            for (let i = 0; i < size; i++) {
                const a = point(x0 + i, y0 + j);
                const b = point(x0 + i + 1, y0 + j);
                positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
            }
        }

        const geo = this.track(new THREE.BufferGeometry());
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.gridMaterial = this.track(new THREE.LineBasicMaterial({
            color: 0x4d9fff,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
        }));
        this.grid = new THREE.LineSegments(geo, this.gridMaterial);
        this.spinGroup.add(this.grid);
    }
}
