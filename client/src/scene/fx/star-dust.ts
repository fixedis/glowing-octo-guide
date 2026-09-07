// client/src/scene/fx/star-dust.ts
//
// ОКРУЖЕНИЕ ЗВЁЗДНОЙ СИСТЕМЫ = небо карты галактики:
//  - 2500 звёзд на сфере R=900 (равномерно по сфере, z = 2u−1);
//  - палитра как в MORTIS: 60% белые / 16% голубые / 14% оранжевые /
//    8% красные / 2% гиганты (увеличенный угловой размер);
//  - мерцание: у каждой звезды своя частота и фаза, считается на GPU;
//  - МЕДЛЕННЫЙ ДРЕЙФ неба вокруг Y (uDrift 0.006 рад/с);
//  - ТУМАННОСТИ = ПОРТ FBM-ШЕЙДЕРА MORTIS (НЕ спрайты, НЕ кружки):
//    рваные клочья с внутренним движением (сдвиг октав шума от uTime),
//    палитра NEBULA_PAIRS прототипа, ОЧЕНЬ РАЗНЫЕ размеры
//    (одна гигантская ~2000 юн + средние 400..720 + малые 250..380).
//
// fx-контракт: getObject() / update(time) / setOpacity(o) / dispose().
// Детерминированность: LCG от сида системы — одно и то же небо у одной системы.

import * as THREE from 'three';

const SKY_RADIUS = 900;
const STAR_COUNT = 2500;
const DRIFT_SPEED = 0.006;

/** Пары цветов эмиссивных туманностей (порт NEBULA_PAIRS прототипа). */
const NEBULA_PAIRS: ReadonlyArray<readonly [string, string]> = [
    ['#7a2030', '#241040'], ['#a02030', '#401018'], ['#1a7070', '#0a2830'],
    ['#5030a0', '#180a30'], ['#802050', '#200a28'], ['#703040', '#180a14'],
    ['#284070', '#0a1428'], ['#206040', '#081810'],
];

/** Детерминированный LCG (как в GodRays/MORTIS/SystemRenderer). */
function makeRng(key: string): () => number {
    let s = 2166136261 >>> 0;
    for (let i = 0; i < key.length; i++) {
        s ^= key.charCodeAt(i);
        s = Math.imul(s, 16777619) >>> 0;
    }
    let state = s || 1;
    return (): number => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0xffffffff;
    };
}

/** Палитра неба: [цвет, вес, множитель размера]. Сумма весов = 1. */
const PALETTE: ReadonlyArray<readonly [number, number, number]> = [
    [0xffffff, 0.60, 1.0], // белые
    [0x9fc4ff, 0.16, 1.1], // голубые
    [0xffc890, 0.14, 1.1], // оранжевые
    [0xff8f6f, 0.08, 1.25], // красные
    [0xfff2d8, 0.02, 3.2], // гиганты
];

function pickPalette(r: number): readonly [number, number] {
    let acc = 0;
    for (const [color, weight, scale] of PALETTE) {
        acc += weight;
        if (r <= acc) return [color, scale];
    }
    return [PALETTE[0]![0], PALETTE[0]![2]];
}

/** Вершинный шейдер фонового полотна туманности. */
const NEB_VERT = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

/**
 * Фрагментный шейдер туманности — ДОСЛОВНЫЙ порт fbm-шейдера MORTIS:
 * два слоя value-noise fbm дают рваные клочья (никаких круглых пятен),
 * сдвиг координат от uTime — медленное внутреннее движение газа.
 */
const NEB_FRAG = /* glsl */ `
    uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB;
    uniform float uOpacity; uniform float uScale; uniform float uBoost;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x),
                   mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
    }
    float fbm(vec2 p) {
        float v = 0.0; float a = 0.5;
        for (int n = 0; n < 4; n++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
        return v;
    }
    void main() {
        vec2 uv = vUv * uScale;
        float n1 = fbm(uv + uTime * 0.012);
        float n2 = fbm(uv * 1.9 - uTime * 0.008 + 4.7);
        float shapeN = smoothstep(0.25, 0.78, n1 * 0.6 + n2 * 0.55);
        float dist = length(vUv - 0.5) * 2.0;
        float edge = clamp(1.0 - dist * dist, 0.0, 1.0);
        edge *= edge;
        vec3 col = mix(uColorB, uColorA, clamp(n1 * 1.6 - 0.3, 0.0, 1.0)) * uBoost;
        float alpha = shapeN * edge * uOpacity;
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(col, alpha);
    }
`;

export class StarDust {
    private readonly group = new THREE.Group();
    private readonly points: THREE.Points;
    private readonly geometry: THREE.BufferGeometry;
    private readonly material: THREE.ShaderMaterial;
    private readonly disposables: Array<{ dispose(): void }> = [];
    /** Uniforms туманностей для анимации uTime. */
    private readonly nebulae: Array<{ uniforms: Record<string, THREE.IUniform>; base: number }> = [];
    private lastTime: number | null = null;

    public constructor(systemSeed: number) {
        const rng = makeRng('system/' + systemSeed + '/stardust');

        // --- Звёзды: равномерно по сфере (Архимед: z = 2u−1).
        const positions = new Float32Array(STAR_COUNT * 3);
        const colors = new Float32Array(STAR_COUNT * 3);
        const sizes = new Float32Array(STAR_COUNT);
        const phases = new Float32Array(STAR_COUNT);
        const twAmps = new Float32Array(STAR_COUNT);
        const twFreqs = new Float32Array(STAR_COUNT);
        const tmp = new THREE.Color();

        for (let i = 0; i < STAR_COUNT; i++) {
            const z = rng() * 2 - 1;
            const theta = rng() * Math.PI * 2;
            const rho = Math.sqrt(Math.max(0, 1 - z * z));
            positions[i * 3] = SKY_RADIUS * rho * Math.cos(theta);
            positions[i * 3 + 1] = SKY_RADIUS * z;
            positions[i * 3 + 2] = SKY_RADIUS * rho * Math.sin(theta);

            const [hex, scaleMul] = pickPalette(rng());
            tmp.setHex(hex);
            colors[i * 3] = tmp.r;
            colors[i * 3 + 1] = tmp.g;
            colors[i * 3 + 2] = tmp.b;

            sizes[i] = (1 + rng() * 1.6) * scaleMul;
            phases[i] = rng() * Math.PI * 2;
            twAmps[i] = 0.25 + rng() * 0.55;
            twFreqs[i] = 0.4 + rng() * 1.8;
        }

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
        this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
        this.geometry.setAttribute('aTwAmp', new THREE.BufferAttribute(twAmps, 1));
        this.geometry.setAttribute('aTwFreq', new THREE.BufferAttribute(twFreqs, 1));
        this.disposables.push(this.geometry);

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uOpacity: { value: 0 },
                // Засветка от солнца: звёзды тускнеют в конусе вокруг
                // направления «на солнце» (на небесной сфере = от центра
                // системы к камере). uSunDir — локальное направление.
                uSunDir: { value: new THREE.Vector3(0, 0, 1) },
                uSunCos: { value: 0.95 }, // cos(радиуса засветки)
                uSunSoft: { value: 0.10 }, // мягкость края конуса
            },
            vertexShader: `
                attribute float aSize;
                attribute vec3 aColor;
                attribute float aPhase;
                attribute float aTwAmp;
                attribute float aTwFreq;
                uniform float uTime;
                uniform vec3 uSunDir;
                uniform float uSunCos;
                uniform float uSunSoft;
                varying vec3 vColor;
                varying float vTw;
                varying float vBright;
                void main() {
                    vColor = aColor;
                    vTw = 1.0 - aTwAmp * (0.5 + 0.5 * sin(uTime * aTwFreq + aPhase));
                    // Угол между направлением к звезде и направлением на
                    // солнце (на небе). Внутри конуса — затемнение.
                    vec3 dir = normalize(position);
                    float c = dot(dir, normalize(uSunDir));
                    float k = smoothstep(uSunCos - uSunSoft, uSunCos + uSunSoft, c);
                    vBright = mix(1.0, 0.08, k); // у солнца ~8% яркости, вдали полная
                    vec4 mv = modelViewMatrix * vec4(position, 1.0);
                    gl_Position = projectionMatrix * mv;
                    gl_PointSize = aSize;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vTw;
                varying float vBright;
                uniform float uOpacity;
                void main() {
                    vec2 c = gl_PointCoord - 0.5;
                    float d = length(c);
                    float alpha = smoothstep(0.5, 0.06, d);
                    float a = alpha * vTw * uOpacity * vBright;
                    if (a < 0.003) discard;
                    gl_FragColor = vec4(vColor, a);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        this.disposables.push(this.material);

        this.points = new THREE.Points(this.geometry, this.material);
        this.points.frustumCulled = false;
        this.points.renderOrder = -10;
        this.group.add(this.points);

        // --- Туманности: порт MORTIS (fbm-клочья), РАЗНЫЕ размеры.
        // Профиль размеров: 1 гигантская (фон) + 5 средних + 4 малых.
        const sizeProfile: ReadonlyArray<number> = [
            1600 + rng() * 600,
            400 + rng() * 320, 400 + rng() * 320, 400 + rng() * 320,
            400 + rng() * 320, 400 + rng() * 320,
            250 + rng() * 130, 250 + rng() * 130, 250 + rng() * 130, 250 + rng() * 130,
        ];
        for (const size of sizeProfile) {
            const pair = NEBULA_PAIRS[(rng() * NEBULA_PAIRS.length) | 0] ?? NEBULA_PAIRS[0]!;
            // Оболочка размещения внутри звёздной сферы.
            const shellR = SKY_RADIUS * (0.55 + rng() * 0.4);
            const th = rng() * Math.PI * 2;
            const ph = Math.acos(2 * rng() - 1);
            const base = 0.22 + rng() * 0.14;
            const uniforms: Record<string, THREE.IUniform> = {
                uTime: { value: 0 },
                uColorA: { value: new THREE.Color(pair[0]) },
                uColorB: { value: new THREE.Color(pair[1]) },
                uOpacity: { value: base },
                uScale: { value: 2.2 + rng() * 1.0 },
                uBoost: { value: 3.0 + rng() * 1.5 },
            };
            const mat = new THREE.ShaderMaterial({
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                uniforms,
                vertexShader: NEB_VERT,
                fragmentShader: NEB_FRAG,
            });
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
            mesh.position.set(
                Math.sin(ph) * Math.cos(th) * shellR,
                Math.cos(ph) * shellR,
                Math.sin(ph) * Math.sin(th) * shellR,
            );
            // Полотно смотрит на центр (камера обычно рядом с центром),
            // случайный крен даёт разнообразие клочьев.
            mesh.lookAt(0, 0, 0);
            mesh.rotateZ(rng() * Math.PI * 2);
            mesh.renderOrder = -9;
            this.disposables.push(mat, mesh.geometry);
            this.nebulae.push({ uniforms, base });
            this.group.add(mesh);
        }
    }

    public getObject(): THREE.Object3D {
        return this.group;
    }

    /** Обновление от НАКОПЛЕННОГО времени кадра (dt считается внутри). */
    public update(time: number): void {
        const dt = this.lastTime === null ? 0 : Math.max(0, time - this.lastTime);
        this.lastTime = time;
        this.material.uniforms.uTime!.value = time;
        // Внутреннее движение газа в туманностях (сдвиг октав шума).
        for (const n of this.nebulae) n.uniforms['uTime']!.value = time;
        // Медленный дрейф всего неба вокруг вертикали.
        this.group.rotation.y += DRIFT_SPEED * dt;
    }

    /**
     * Направление на солнце в МИРОВЫХ координатах. Звёзды вокруг него на
     * небе тускнеют (засветка). Переводим в локальное пространство неба
     * (с учётом его медленного дрейфа), т.к. звёзды заданы в локалке.
     */
    public setSunDirection(worldDir: THREE.Vector3): void {
        const local = worldDir.clone();
        const inv = new THREE.Matrix4().makeRotationY(-this.group.rotation.y);
        local.applyMatrix4(inv).normalize();
        this.material.uniforms.uSunDir!.value.copy(local);
    }

    /** Прозрачность окружения 0..1 (следует за прозрачностью слоя системы). */
    public setOpacity(opacity: number): void {
        const o = THREE.MathUtils.clamp(opacity, 0, 1);
        this.material.uniforms.uOpacity!.value = o;
        for (const n of this.nebulae) {
            n.uniforms['uOpacity']!.value = n.base * o;
        }
        this.group.visible = o > 0.01;
    }

    public dispose(): void {
        for (const d of this.disposables) d.dispose();
        this.disposables.length = 0;
        this.nebulae.length = 0;
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]!);
        }
    }
}
