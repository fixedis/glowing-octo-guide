// client/src/scene/fx/mortis-galaxy.ts
import * as THREE from 'three';
import { createVortexShape, MORTIS_PALETTES, type GalaxyShape } from '../../core/galaxy-shape.js';

/**
 * Полный порт визуала галактики MORTIS-9 из прототипа galaxy-map-3d.html.
 *
 * Восстановлены ВСЕ слои прототипа: молодые звёзды рукавов + межрукавная
 * дымка, старые звёзды + шаровые скопления, тёмная пыль, HII-области, угольки
 * с дрейфом, воронка ядра, дальний фон с полосой, три спрайта ядра, гало
 * (inner/outer/disk), fbm-туманности, маяки (beacons) и блики (flares).
 * Шейдеры перенесены дословно (дифференциальный сдвиг uShear, мерцание,
 * дрейф угольков) и адаптированы под плоскость диска XY движка.
 *
 * Инварианты движка:
 *  - диск БЕЗ собственного наклона и вращения: их делает galaxyLayer в
 *    WorldScene, иначе звёздные системы оторвались бы от рукавов;
 *  - вращается только воронка ядра (вокруг Z — нормали диска);
 *  - генерация детерминирована: mulberry32 от ключа ветки сборки.
 *
 * fx-контракт: getObject()/update(dt)/setOpacity()/dispose() + disposables.
 */

const TAU = Math.PI * 2;

/** Пары цветов эмиссивных туманностей (порт NEBULA_PAIRS прототипа). */
const NEBULA_PAIRS: ReadonlyArray<readonly [string, string]> = [
    ['#7a2030', '#241040'], ['#a02030', '#401018'], ['#1a7070', '#0a2830'],
    ['#5030a0', '#180a30'], ['#802050', '#200a28'], ['#703040', '#180a14'],
    ['#284070', '#0a1428'], ['#206040', '#081810'],
];

function mulberry32(seed: number): () => number {
    // Та же математика, что SeedGraph.mulberry32 — локальная копия для чистоты слоя.
    let state = seed | 0;
    return (): number => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export class MortisGalaxy {
    private readonly group = new THREE.Group();
    private readonly spinGroup = new THREE.Group();
    private readonly disposables: Array<{ dispose(): void }> = [];
    private readonly starMaterial: THREE.ShaderMaterial;
    private readonly emberMaterial: THREE.ShaderMaterial;
    private readonly dustMaterial: THREE.ShaderMaterial;
    private readonly vortexMaterial: THREE.ShaderMaterial;
    private readonly vortex: THREE.Points;
    private readonly nebulae: Array<{ uniforms: Record<string, THREE.IUniform>; base: number }> = [];
    /** Спрайты свечения (ядро + гало): базовая прозрачность до умножения. */
    private readonly glowSprites: Array<{ mat: THREE.SpriteMaterial; base: number }> = [];
    private readonly beacons: Array<THREE.Sprite> = [];
    private readonly flares: Array<THREE.Sprite> = [];
    private readonly shape: GalaxyShape;

    private time = 0;
    private globalOpacity = 1;
    private seedGraph: import('../../core/seed-graph.js').SeedGraph | null;

    public constructor(shape: GalaxyShape, radius: number, seedKey: number, seedGraph?: import('../../core/seed-graph.js').SeedGraph) {
        this.shape = shape;
        this.seedGraph = seedGraph ?? null;
        const palette = MORTIS_PALETTES[shape.paletteIndex] ?? MORTIS_PALETTES[0]!;

        const rng = mulberry32(seedKey | 0);
        const rand = (a: number, b: number): number => a + rng() * (b - a);
        const gauss = (): number => (rng() + rng() + rng() - 1.5) * 0.7;

        const R = Math.max(8, radius);
        const ARMS = shape.arms;
        this.group.add(this.spinGroup);

        // ---------- Материалы (шейдеры из прототипа, ось Y -> ось Z диска) ----------
        // Дифференциальный сдвиг ОТКЛЮЧЁН: звёздные системы (карта систем)
        // приросли к слою и не сдвигаются шейдером — при активном uShear
        // рукава обгоняли системы и рассинхронизировались с картой.
        // Частицы обязаны вращаться РОВНО со скоростью слоя систем.
        const shear = 0;

        this.starMaterial = new THREE.ShaderMaterial({
            depthWrite: false,
            transparent: true,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uSize: { value: 1.9 },
                uTime: { value: 0 },
                uTwAmp: { value: shape.twinkleAmp },
                uTwMin: { value: 0.10 },
                uTwMax: { value: 0.35 },
                uShear: { value: shear },
                uOpacity: { value: 1 },
            },
            vertexShader: /* glsl */ `
                uniform float uSize; uniform float uTime;
                uniform float uTwAmp; uniform float uTwMin; uniform float uTwMax;
                uniform float uShear;
                attribute float aScale; attribute vec3 aColor; attribute float aPhase;
                varying vec3 vColor; varying float vTw;
                void main() {
                    // Дифференциальный сдвиг: поворот вокруг нормали диска (Z),
                    // сильнее в центре (делитель растёт с радиусом).
                    float sr = length(position.xy) + 1e-4;
                    float da = uTime * uShear / (1.0 + sr * 0.06);
                    float cs = cos(da); float sn = sin(da);
                    vec3 pos = vec3(
                        position.x * cs - position.y * sn,
                        position.x * sn + position.y * cs,
                        position.z);
                    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
                    gl_Position = projectionMatrix * mv;
                    float dist = max(-mv.z, 0.1);
                    gl_PointSize = min(uSize * aScale * (300.0 / dist), 20.0);
                    vColor = aColor;
                    float sp = mix(uTwMin, uTwMax, aPhase);
                    vTw = 1.0 - uTwAmp * 0.5 + uTwAmp * 0.5 * sin(uTime * sp + aPhase * 40.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform float uOpacity;
                varying vec3 vColor; varying float vTw;
                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    if (d > 0.5) discard;
                    float a = pow(1.0 - d * 2.0, 2.4) * vTw * uOpacity;
                    if (a < 0.003) discard;
                    gl_FragColor = vec4(vColor, a);
                }
            `,
        });
        this.disposables.push(this.starMaterial);

        this.emberMaterial = new THREE.ShaderMaterial({
            depthWrite: false,
            transparent: true,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uSize: { value: 2.2 },
                uTime: { value: 0 },
                uDrift: { value: shape.embersDrift },
                uVDrift: { value: 0.15 },
                uSpeed: { value: shape.embersSpeed },
                uSpinDir: { value: shape.spinSign },
                uShear: { value: shear },
                uOpacity: { value: 1 },
            },
            vertexShader: /* glsl */ `
                uniform float uSize; uniform float uTime;
                uniform float uDrift; uniform float uVDrift;
                uniform float uSpeed; uniform float uSpinDir;
                uniform float uShear;
                attribute float aScale; attribute vec3 aColor;
                attribute float aPhase; attribute float aDrift;
                varying vec3 vColor; varying float vA;
                void main() {
                    float sr = length(position.xy) + 1e-4;
                    float da = uTime * uShear / (1.0 + sr * 0.06);
                    float cs = cos(da); float sn = sin(da);
                    vec3 p = vec3(
                        position.x * cs - position.y * sn,
                        position.x * sn + position.y * cs,
                        position.z);
                    float t = uTime * uSpeed;
                    float ph = aPhase * 6.28318;
                    // Тангенс орбиты вокруг оси Z (CCW при положительном спине).
                    vec3 tang = normalize(vec3(-p.y, p.x, 0.0) + vec3(1e-5, 1e-5, 0.0));
                    float along = sin(t + ph) * uDrift * aDrift * uSpinDir;
                    p.x += tang.x * along;
                    p.y += tang.y * along;
                    p.z += sin(t * 0.7 + ph * 1.7) * uVDrift * aDrift;
                    vec4 mv = modelViewMatrix * vec4(p, 1.0);
                    gl_Position = projectionMatrix * mv;
                    float dist = max(-mv.z, 0.1);
                    gl_PointSize = min(uSize * aScale * (300.0 / dist), 14.0);
                    vColor = aColor;
                    vA = 0.75 + 0.25 * sin(t * 2.0 + ph * 3.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform float uOpacity;
                varying vec3 vColor; varying float vA;
                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    if (d > 0.5) discard;
                    float a = pow(1.0 - d * 2.0, 2.2) * vA * uOpacity;
                    if (a < 0.003) discard;
                    gl_FragColor = vec4(vColor, a);
                }
            `,
        });
        this.disposables.push(this.emberMaterial);

        // Материал внутренней спирали: собственный шейдер с кеплеровским
        // дифференциалом — каждое кольцо вращается со скоростью ~1/sqrt(r),
        // внутренние витки обгоняют внешние => спираль ВКРУЧИВАЕТСЯ.
        // Знак uVortexShear согласован с направлением слоя систем.
        this.vortexMaterial = new THREE.ShaderMaterial({
            depthWrite: false,
            transparent: true,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uSize: { value: 2.1 },
                uTime: { value: 0 },
                // Строго в сторону закрутки: спираль намотана CCW => +CCW.
                uShearW: { value: 0.45 },
                uOpacity: { value: 1 },
            },
            vertexShader: /* glsl */ `
                uniform float uSize; uniform float uTime; uniform float uShearW;
                attribute float aScale; attribute vec3 aColor; attribute float aPhase;
                varying vec3 vColor; varying float vTw;
                void main() {
                    // Кеплеровский дифференциал: угол поворота ~ t / sqrt(r).
                    float r = max(length(position.xy), 0.55);
                    float da = uTime * uShearW / sqrt(r);
                    float cs = cos(da); float sn = sin(da);
                    vec3 pos = vec3(
                        position.x * cs - position.y * sn,
                        position.x * sn + position.y * cs,
                        position.z);
                    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
                    gl_Position = projectionMatrix * mv;
                    float dist = max(-mv.z, 0.1);
                    gl_PointSize = min(uSize * aScale * (300.0 / dist), 18.0);
                    vColor = aColor;
                    vTw = 0.85 + 0.15 * sin(uTime * 0.9 + aPhase * 40.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform float uOpacity;
                varying vec3 vColor; varying float vTw;
                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    if (d > 0.5) discard;
                    float a = pow(1.0 - d * 2.0, 2.3) * vTw * uOpacity;
                    if (a < 0.003) discard;
                    gl_FragColor = vec4(vColor, a);
                }
            `,
        });
        this.disposables.push(this.vortexMaterial);

        // Тёмная пыль: NormalBlending, мягкий тёмно-коричневый, экранный
        // размер ограничен против муара. Возвращена по решению пользователя
        // (прожилки на рукавах главных галактик — нужный визуал).
        this.dustMaterial = new THREE.ShaderMaterial({
            depthWrite: false,
            transparent: true,
            blending: THREE.NormalBlending,
            uniforms: {
                uSize: { value: 2.6 },
                uColor: { value: new THREE.Color('#1a100c') },
                uTime: { value: 0 },
                uShear: { value: shear },
                uOpacity: { value: 1 },
            },
            vertexShader: /* glsl */ `
                uniform float uSize; uniform float uTime; uniform float uShear;
                attribute float aScale; attribute float aAlpha;
                varying float vA;
                void main() {
                    // Тот же дифференциальный сдвиг, что у звёзд/угольков:
                    // пыль деформируется синхронно с диском.
                    float sr = length(position.xy) + 1e-4;
                    float da = uTime * uShear / (1.0 + sr * 0.06);
                    float cs = cos(da); float sn = sin(da);
                    vec3 pos = vec3(
                        position.x * cs - position.y * sn,
                        position.x * sn + position.y * cs,
                        position.z);
                    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
                    gl_Position = projectionMatrix * mv;
                    float dist = max(-mv.z, 0.1);
                    gl_PointSize = min(uSize * aScale * (300.0 / dist), 12.0);
                    vA = aAlpha;
                }
            `,
            fragmentShader: /* glsl */ `
                uniform vec3 uColor; uniform float uOpacity;
                varying float vA;
                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    if (d > 0.5) discard;
                    float a = pow(1.0 - d * 2.0, 1.5) * vA * uOpacity;
                    if (a < 0.004) discard;
                    gl_FragColor = vec4(uColor, a);
                }
            `,
        });
        this.disposables.push(this.dustMaterial);

        // ---------- Бюджет частиц (пропорционально радиусу, детерминирован) ----------
        const k = Math.min(R / 60, 1.6);
        const counts = {
            armStars: Math.round(55000 * k),
            haze: Math.round(12000 * k),
            oldStars: Math.round(18000 * k),
            dust: Math.round(15000 * k),
            hii: Math.round(2500 * k),
            embers: Math.round(8000 * k),
            vortex: Math.round(7000 * k),
            bgStars: Math.round(9000 * Math.min(R / 60, 1.2)),
            bgNear: Math.round(2500 * Math.min(R / 60, 1.2)),
            clumps: Math.max(40, Math.round(150 * k)),
            globulars: Math.max(4, Math.round(10 * k)),
        };

        /** Накопитель атрибутов одного слоя частиц. */
        class Layer {
            public readonly pos: number[] = [];
            public readonly col: number[] = [];
            public readonly scl: number[] = [];
            public readonly ph: number[] = [];
            public readonly al: number[] = [];
            public readonly dr: number[] = [];

            public push(x: number, y: number, z: number, s: number, c?: THREE.Color, a?: number, drift?: number): void {
                this.pos.push(x, y, z);
                this.scl.push(s);
                if (c !== undefined) this.col.push(c.r, c.g, c.b);
                if (a !== undefined) this.al.push(a);
                if (drift !== undefined) this.dr.push(drift);
                this.ph.push(rng());
            }

            public get count(): number { return this.scl.length; }
        }

        const armStars = new Layer();
        const oldStars = new Layer();
        const hiiLayer = new Layer();
        const bgStars = new Layer();
        const dustLayer = new Layer();
        const embersLayer = new Layer();
        const vortexLayer = new Layer();

        const c = new THREE.Color();
        const cYA = new THREE.Color(palette.youngA);
        const cYB = new THREE.Color(palette.youngB);
        const cOA = new THREE.Color(palette.oldA);
        const cOB = new THREE.Color(palette.oldB);
        const cHA = new THREE.Color(palette.hiiA);
        const cHB = new THREE.Color(palette.hiiB);
        const cEA = new THREE.Color(palette.emberA);
        const cEB = new THREE.Color(palette.emberB);
        const cVI = new THREE.Color(palette.vortexIn);
        const cVO = new THREE.Color(palette.vortexOut);

        const armCenterOff = (r: number, arm: number): number => shape.armCenterOffset(r, arm);
        const armWidth = (r: number, arm: number): number => shape.armWidth(r, arm);
        const armAngle = (r: number, arm: number, d: number): number => shape.armAngle(r, arm, d);

        // Узлы звездообразования вдоль осевых линий рукавов.
        const clumps: THREE.Vector3[] = [];
        for (let i = 0; i < counts.clumps; i++) {
            const arm = i % ARMS;
            const r = 6 + Math.pow(rng(), 0.8) * (R - 8);
            const d = armCenterOff(r, arm) + gauss() * armWidth(r, arm) * 0.45;
            const a = armAngle(r, arm, d);
            clumps.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, gauss() * 0.7));
        }

        // --- Молодые звёзды рукавов ---
        for (let i = 0; i < counts.armStars; i++) {
            let x: number, y: number, z: number, dim: number;
            if (rng() < 0.28) {
                const cl = clumps[(rng() * clumps.length) | 0]!;
                x = cl.x + gauss() * 1.8;
                y = cl.y + gauss() * 0.6;
                z = cl.z + gauss() * 0.6;
                dim = rand(0.22, 0.55);
            } else {
                const arm = i % ARMS;
                const r = 4 + Math.pow(rng(), 1.15) * (R - 4);
                const w = armWidth(r, arm);
                const g = gauss();
                const feather = rng() < shape.feather ? 2.6 : 1;
                const d = armCenterOff(r, arm) + g * w * feather;
                const a = armAngle(r, arm, d);
                const rr = r + gauss() * 1.6;
                x = Math.cos(a) * rr;
                y = Math.sin(a) * rr;
                z = gauss() * (0.5 + 2.0 * Math.exp(-r / 20) + r * 0.012);
                dim = rand(0.22, 0.55) * (1 - 0.45 * Math.min(Math.abs(g) / 2, 1));
            }
            c.copy(cYA).lerp(cYB, rng()).multiplyScalar(dim);
            armStars.push(x, y, z, rand(0.3, 1.0) + (rng() < 0.04 ? 0.8 : 0), c);
        }

        // --- Межрукавная дымка ---
        for (let i = 0; i < counts.haze; i++) {
            const r = 6 + Math.pow(rng(), 1.3) * (R - 6);
            const a = rng() * TAU;
            c.copy(cYA).lerp(cYB, rng() * 0.5).multiplyScalar(rand(0.08, 0.22));
            armStars.push(
                Math.cos(a) * r + gauss() * 2,
                Math.sin(a) * r + gauss() * 2,
                gauss() * (1.0 + 2.5 * Math.exp(-r / 25)),
                rand(0.3, 0.8),
                c,
            );
        }

        // --- Старые звёзды: балдж + диск ---
        for (let i = 0; i < counts.oldStars; i++) {
            let x: number, y: number, z: number;
            if (i < counts.oldStars * 0.39) {
                const rr = 2.5 + Math.pow(rng(), 0.7) * 8 * Math.max(1, R / 60);
                const th = rng() * TAU;
                const ph = Math.acos(2 * rng() - 1);
                x = Math.sin(ph) * Math.cos(th) * rr;
                y = Math.cos(ph) * rr * 0.72;
                z = Math.sin(ph) * Math.sin(th) * rr;
            } else {
                const r = R * Math.pow(rng(), 1.6);
                const a = rng() * TAU;
                x = Math.cos(a) * r + gauss() * 1.2;
                y = Math.sin(a) * r + gauss() * 1.2;
                z = gauss() * (0.8 + 3.0 * Math.exp(-r / 25));
            }
            c.copy(cOA).lerp(cOB, rng()).multiplyScalar(rand(0.14, 0.34));
            oldStars.push(x, y, z, rand(0.3, 0.9), c);
        }

        // --- Шаровые скопления ---
        for (let kk = 0; kk < counts.globulars; kk++) {
            const th = rng() * TAU;
            const ph = Math.acos(2 * rng() - 1);
            const rr = rand(24, 46) * Math.max(0.6, R / 60);
            const cx = Math.sin(ph) * Math.cos(th) * rr;
            const cy = Math.cos(ph) * rr * 0.8;
            const cz = Math.sin(ph) * Math.sin(th) * rr;
            for (let i = 0; i < 300; i++) {
                c.copy(cOB).multiplyScalar(rand(0.18, 0.4));
                oldStars.push(cx + gauss() * 0.9, cy + gauss() * 0.9, cz + gauss() * 0.9, rand(0.25, 0.7), c);
            }
        }

        // --- Тёмная пыль: прожилки вдоль внутренней кромки рукавов.
        // КАК В ОРИГИНАЛЕ: полная плотность/альфа/размер из прототипа
        // (объём рукавов дают именно тёмные прожилки). Вырез у воронки —
        // только мягкий ramp от края мини-спирали, зона ядра чистая.
        const VR = Math.min(shape.vortexRadius, R * 1.2);
        const dustInner = VR + 4;
        for (let i = 0; i < counts.dust; i++) {
            const arm = i % ARMS;
            const r = 5 + Math.pow(rng(), 1.05) * (R - 6);
            if (r < dustInner) {
                continue;
            }
            const w = armWidth(r, arm) * 0.55;
            const d = armCenterOff(r, arm) - w * 0.6 + gauss() * w * (rng() < 0.15 ? 2.2 : 1);
            const a = armAngle(r, arm, d);
            const rr = r + gauss() * 1.2;
            dustLayer.pos.push(Math.cos(a) * rr, Math.sin(a) * rr, gauss() * (0.4 + 1.2 * Math.exp(-r / 22)));
            dustLayer.scl.push(rand(1.0, 2.8));
            dustLayer.al.push(rand(0.16, 0.42) * (rng() < 0.7 ? 1 : 0.35));
            dustLayer.ph.push(0);
        }

        // --- HII-области (в узлах звездообразования) ---
        for (let i = 0; i < counts.hii; i++) {
            const cl = clumps[(rng() * clumps.length) | 0]!;
            c.copy(cHA).lerp(cHB, rng()).multiplyScalar(rand(0.30, 0.70));
            hiiLayer.push(cl.x + gauss() * 1.2, cl.y + gauss() * 0.5, cl.z + gauss() * 0.5, rand(0.5, 1.3), c);
        }

        // --- Угольки с дрейфом вдоль рукавов ---
        for (let i = 0; i < counts.embers; i++) {
            const arm = i % ARMS;
            const r = 5 + Math.pow(rng(), 1.1) * (R - 5);
            const w = armWidth(r, arm) * 1.2;
            const d = armCenterOff(r, arm) + gauss() * w;
            const a = armAngle(r, arm, d);
            const rr = r + gauss() * 2.0;
            if (rng() < 0.15) {
                c.copy(cEB).multiplyScalar(rand(0.10, 0.30) * 1.6);
            } else {
                c.copy(cEA).lerp(cYB, rng() * 0.4).multiplyScalar(rand(0.10, 0.30));
            }
            embersLayer.push(
                Math.cos(a) * rr,
                Math.sin(a) * rr,
                gauss() * (0.6 + 1.6 * Math.exp(-r / 22)),
                rand(0.5, 1.6),
                c,
                undefined,
                rand(0.4, 1.2),
            );
        }

        // --- Внутренняя спираль: собственный рандом (createVortexShape) ---
        // Рукава 1-4, длина/толщина/старт от ядра/скорость — всё случайно.
        // Геометрия: логарифмическая спираль r = r0*exp(-twist*θ), намотанная
        // ПРОТИВ часовой; шейдер докручивает её ПРОТИВ часовой же (знак
        // uShearW > 0) — строго в сторону закрутки. Хвост уходит в ядро и
        // растворяется: ни тёмных точек, ни обрывов.
        const vsh = createVortexShape(this.seedGraph ?? { rng: (): (() => number) => (): number => 0.5 } as never, Math.round(seedKey));
        const vArms = vsh.arms;
        // Полный размах без ужимающих множителей: воронка может занимать
        // значительную часть диска, как в оригинале (радиус до ~80 юнитов).
        const vR = Math.min(vsh.radius * Math.max(0.7, R / 60), R * 1.1);
        const thick = vsh.thickness * Math.max(0.6, R / 60);
        // Нормировка затухания: логспираль ОБЯЗАНА пройти весь путь от vR
        // до ядра на всей своей длине, при любом twist. Иначе при тугой
        // закрутке экспонента умирает на первых процентах рукава и воронка
        // визуально всегда маленькая.
        const turns = 2.0 * (0.5 + vsh.twist);
        const thetaMax = TAU * turns;
        const kDecay = Math.log(Math.max(vR, 1e-3) / 0.3) / thetaMax;
        for (let i = 0; i < counts.vortex; i++) {
            const t = rng();                          // позиция вдоль рукава 0..1
            const theta = t * thetaMax;
            const arm = i % vArms;
            const phase = (arm / vArms) * TAU;
            // Логспираль наружу CCW: угол растёт, радиус падает к центру.
            const a = phase + theta;
            const radBase = 0.3 + (vR - 0.3) * Math.exp(-kDecay * theta);
            // ПЕРЕМЕННАЯ толщина: пропорциональна локальному радиусу
            // (виток у ядра узкий, внешний — широкий) и пульсирует вдоль
            // рукава (2 утолщения на виток), как armWidth у больших галактик.
            const rel = radBase / Math.max(vR, 1e-3);
            const pulse = 0.65 + 0.7 * (0.5 + 0.5 * Math.sin(theta * 2.0 / TAU * Math.PI * 4 + arm * 1.7));
            const localThick = thick * (0.22 + 0.78 * rel) * pulse;
            const jitter = gauss() * localThick;
            const angJitter = gauss() * (localThick / Math.max(radBase, 0.3)) * 0.5;
            const aa = a + angJitter;
            const rad = Math.max(radBase + jitter, 0.12);
            const zz = -shape.vortexDepth * 0.25 * Math.pow(t, 1.7) + gauss() * (0.12 + 0.3 * rel);
            const fade = Math.pow(t, 0.75);
            c.copy(cVI).lerp(cVO, 1 - t).multiplyScalar(rand(0.5, 1.0) * (0.3 + 0.7 * fade));
            vortexLayer.push(
                Math.cos(aa) * rad,
                Math.sin(aa) * rad,
                zz,
                rand(0.4, 1.0) * (0.3 + 0.7 * fade),
                c,
            );
        }

        // --- Дальний фон (с полосой Млечного Пути) ---
        const bandRot = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.6, 0, 0.4));
        const bv = new THREE.Vector3();
        for (let i = 0; i < counts.bgStars; i++) {
            const th = rng() * TAU;
            const ph = Math.acos(2 * rng() - 1);
            bv.set(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
            if (rng() < shape.bgBand) {
                bv.y *= 0.18;
                bv.applyMatrix4(bandRot);
            }
            const rr = rand(500, 1400);
            const b = rand(0.35, 0.85) * (rng() < 0.06 ? 2.2 : 1);
            c.setRGB(b * (0.8 + rng() * 0.2), b * (0.85 + rng() * 0.15), b);
            bgStars.push(bv.x * rr, bv.y * rr, bv.z * rr, rand(1.2, 3.0) + (rng() < 0.05 ? 2.0 : 0), c);
        }
        for (let i = 0; i < counts.bgNear; i++) {
            const th = rng() * TAU;
            const ph = Math.acos(2 * rng() - 1);
            const rr = rand(250, 600);
            let b = rand(0.30, 0.80);
            if (rng() < 0.05) b *= 1.8;
            const warm = rng() < 0.25;
            c.setRGB(b * (warm ? 1.0 : 0.8), b * (warm ? 0.85 : 0.9), b * (warm ? 0.7 : 1.0));
            bgStars.push(
                Math.sin(ph) * Math.cos(th) * rr,
                Math.cos(ph) * rr,
                Math.sin(ph) * Math.sin(th) * rr,
                rand(0.8, 2.0),
                c,
            );
        }

        // ---------- Geometry -> Points ----------
        const toPoints = (layer: Layer, mat: THREE.ShaderMaterial, order: number, useColor: boolean): THREE.Points => {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(layer.pos, 3));
            if (useColor && layer.col.length === layer.pos.length) {
                g.setAttribute('aColor', new THREE.Float32BufferAttribute(layer.col, 3));
            }
            g.setAttribute('aScale', new THREE.Float32BufferAttribute(layer.scl, 1));
            g.setAttribute('aPhase', new THREE.Float32BufferAttribute(layer.ph, 1));
            if (layer.al.length > 0) g.setAttribute('aAlpha', new THREE.Float32BufferAttribute(layer.al, 1));
            if (layer.dr.length > 0) g.setAttribute('aDrift', new THREE.Float32BufferAttribute(layer.dr, 1));
            this.disposables.push(g);
            const p = new THREE.Points(g, mat);
            p.frustumCulled = false;
            p.renderOrder = order;
            return p;
        };

        this.spinGroup.add(toPoints(armStars, this.starMaterial, 2, true));
        this.spinGroup.add(toPoints(oldStars, this.starMaterial, 2, true));
        this.spinGroup.add(toPoints(dustLayer, this.dustMaterial, 3, false));
        this.spinGroup.add(toPoints(hiiLayer, this.starMaterial, 3, true));
        this.spinGroup.add(toPoints(embersLayer, this.emberMaterial, 4, true));

        this.vortex = toPoints(vortexLayer, this.vortexMaterial, 4, true);
        this.spinGroup.add(this.vortex);

        // Фон не участвует во вращении воронки — в корневую группу.
        this.group.add(toPoints(bgStars, this.starMaterial, 0, true));

        // ---------- Ядро: три слоя свечения (масштабы пропорциональны R) ----------
        const coreCfg = [
            { s: R * 0.43, op: 0.16 },
            { s: R * 0.12, op: 0.30 },
            { s: R * 0.037, op: 0.75 },
        ];
        const glowTex = MortisGalaxy.makeGlowTexture();
        this.disposables.push(glowTex);
        coreCfg.forEach((cfg, i) => {
            const mat = new THREE.SpriteMaterial({
                map: glowTex,
                color: new THREE.Color(palette.core[i] ?? '#ff7040'),
                transparent: true,
                opacity: cfg.op,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            });
            const sp = new THREE.Sprite(mat);
            sp.scale.setScalar(cfg.s);
            sp.renderOrder = 5;
            this.spinGroup.add(sp);
            this.disposables.push(mat);
            this.glowSprites.push({ mat, base: cfg.op });
        });

        // ---------- Гало (порт halo из прототипа, масштабы от R) ----------
        const haloTex = MortisGalaxy.makeHaloTexture();
        const diskTex = MortisGalaxy.makeDiskGlowTexture();
        this.disposables.push(haloTex, diskTex);
        const haloCfg = [
            { tex: haloTex, color: palette.core[1] ?? '#c05838', s: R * 0.97, op: 0.22 },
            { tex: haloTex, color: palette.core[0] ?? '#a06848', s: R * 2.17, op: 0.08 },
            { tex: diskTex, color: palette.core[0] ?? '#a06848', s: R * 3.67, op: 0.09 },
        ];
        haloCfg.forEach((cfg) => {
            const mat = new THREE.SpriteMaterial({
                map: cfg.tex,
                color: new THREE.Color(cfg.color),
                transparent: true,
                opacity: cfg.op,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            });
            const sp = new THREE.Sprite(mat);
            sp.scale.setScalar(cfg.s);
            sp.renderOrder = 3;
            this.spinGroup.add(sp);
            this.disposables.push(mat);
            this.glowSprites.push({ mat, base: cfg.op });
        });

        // ---------- Маяки: далёкие пульсирующие красные источники ----------
        const beaconTex = MortisGalaxy.makeBeaconTexture();
        this.disposables.push(beaconTex);
        const beaconCount = 10;
        for (let i = 0; i < beaconCount; i++) {
            const mat = new THREE.SpriteMaterial({
                map: beaconTex,
                transparent: true,
                opacity: 0.04,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            });
            const sp = new THREE.Sprite(mat);
            let pos: THREE.Vector3;
            if (i < Math.ceil(beaconCount * 0.6)) {
                const cl = clumps[(rng() * clumps.length) | 0]!;
                pos = new THREE.Vector3(cl.x + gauss() * 2.5, cl.y + gauss() * 2.5, cl.z + gauss() * 0.8);
            } else {
                const th = rng() * TAU;
                const rOut = R * rand(1.5, 3.2);
                pos = new THREE.Vector3(Math.cos(th) * rOut, Math.sin(th) * rOut, gauss() * 4);
            }
            sp.position.copy(pos);
            sp.scale.setScalar(rand(2.0, 7.0));
            sp.renderOrder = 6;
            sp.userData.speed = rand(0.4, 0.95);
            sp.userData.phase = rand(0, TAU);
            sp.userData.peak = rand(0.6, 1.0);
            this.spinGroup.add(sp);
            this.beacons.push(sp);
            this.disposables.push(mat);
        }

        // ---------- Блики: крестовые дифракционные вспышки ----------
        const flareTex = MortisGalaxy.makeFlareTexture();
        this.disposables.push(flareTex);
        const flareCount = 7;
        for (let i = 0; i < flareCount; i++) {
            const mat = new THREE.SpriteMaterial({
                map: flareTex,
                transparent: true,
                opacity: rand(0.08, 0.22),
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                rotation: rand(0, Math.PI),
            });
            const sp = new THREE.Sprite(mat);
            if (i === 0) {
                sp.position.set(0, 0, 0);
            } else {
                const cl = clumps[(rng() * clumps.length) | 0]!;
                sp.position.set(cl.x + gauss() * 1.5, cl.y + gauss() * 1.5, cl.z + gauss() * 0.5);
            }
            sp.scale.setScalar(rand(5.0, 12.0));
            sp.renderOrder = 6;
            sp.userData.rotSpeed = rand(-0.05, 0.05);
            this.spinGroup.add(sp);
            this.flares.push(sp);
            this.disposables.push(mat);
        }

        // ---------- Туманности: как в оригинальном прототипе ----------
        // Гигантская фоновая + средние по дальнему полю (дальность 240..900,
        // размеры 260..520 юнитов), палитра NEBULA_PAIRS. В плоскости диска.
        const nebCount = 3 + ((rng() * 4) | 0);
        for (let i = 0; i < nebCount; i++) {
            const pair = NEBULA_PAIRS[(rng() * NEBULA_PAIRS.length) | 0] ?? NEBULA_PAIRS[0]!;
            const huge = i === 0;
            const shellR = huge ? rand(700, 950) : rand(240, 480) * Math.max(0.7, R / 60);
            const th = rng() * TAU;
            const ph = Math.acos(2 * rng() - 1);
            const size = huge ? rand(2200, 2800) : rand(260, 560);
            const base = huge ? 0.28 : rand(0.22, 0.34);
            const uniforms: Record<string, THREE.IUniform> = {
                uTime: { value: 0 },
                uColorA: { value: new THREE.Color(pair[0]) },
                uColorB: { value: new THREE.Color(pair[1]) },
                uOpacity: { value: base },
                uScale: { value: rand(2.2, 3.2) },
                uBoost: { value: rand(3.0, 4.5) },
            };
            const mat = new THREE.ShaderMaterial({
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                uniforms,
                vertexShader: /* glsl */ `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: /* glsl */ `
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
                `,
            });
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
            mesh.position.set(
                Math.sin(ph) * Math.cos(th) * shellR,
                Math.cos(ph) * shellR * 0.35,
                Math.sin(ph) * Math.sin(th) * shellR,
            );
            mesh.renderOrder = 0;
            this.disposables.push(mat, mesh.geometry);
            this.nebulae.push({ uniforms, base });
            this.group.add(mesh);
        }
    }

    /** dt-анимация: время шейдеров, воронка, пульс ядра/гало, маяки, блики. */
    public update(dt: number): void {
        this.time += dt;
        const t = this.time;
        // Внутренняя спираль вкручивается собственным шейдером
        // (кеплеровский дифференциал uShearW) — быстрее слоя систем.
        this.vortexMaterial.uniforms['uTime']!.value = t;
        this.starMaterial.uniforms['uTime']!.value = t;
        this.emberMaterial.uniforms['uTime']!.value = t;
        this.dustMaterial.uniforms['uTime']!.value = t;
        for (const n of this.nebulae) n.uniforms['uTime']!.value = t;
        // Пульс ядра и гало (амплитуды из прототипа).
        const pulses = [0.15, 0.12, 0.08, 0.18, 0.20, 0.15];
        const speeds = [0.4, 0.5, 1.3, 0.4, 0.4, 0.25];
        const shifts = [0.0, 1.0, 0.0, 0.0, 1.5, 0.0];
        for (let i = 0; i < this.glowSprites.length; i++) {
            const gs = this.glowSprites[i]!;
            const pulse = pulses[i % pulses.length] ?? 0;
            const speed = speeds[i % speeds.length] ?? 0;
            const shift = shifts[i % shifts.length] ?? 0;
            gs.mat.opacity = gs.base * this.globalOpacity * (1 + Math.sin(t * speed + shift) * pulse);
        }
        for (const b of this.beacons) {
            b.material.opacity =
                0.04 + Math.pow(Math.max(0, Math.sin(t * b.userData.speed + b.userData.phase)), 10) * b.userData.peak;
        }
        for (const f of this.flares) {
            f.material.rotation += dt * f.userData.rotSpeed;
        }
    }

    public getObject(): THREE.Object3D {
        return this.group;
    }

    public setOpacity(o: number): void {
        const c = THREE.MathUtils.clamp(o, 0, 1);
        this.globalOpacity = c;
        // БЕЗ минимального пола яркости: при входе в звёздную систему галактика
        // обязана гаснуть ПОЛНОСТЬЮ (у системы своё небо из 2500 звёзд — космос
        // не останется пустым). Пол Math.max(c, 0.35) оставлял видимые рукава.
        this.starMaterial.uniforms['uOpacity']!.value = c;
        this.emberMaterial.uniforms['uOpacity']!.value = c;
        this.dustMaterial.uniforms['uOpacity']!.value = c;
        this.vortexMaterial.uniforms['uOpacity']!.value = c;
        for (const gs of this.glowSprites) gs.mat.opacity = gs.base * c;
        for (let i = 0; i < this.nebulae.length; i++) {
            const n = this.nebulae[i]!;
            n.uniforms['uOpacity']!.value = n.base * c;
        }
    }

    public getOpacity(): number {
        return this.globalOpacity;
    }

    public dispose(): void {
        for (const d of this.disposables) d.dispose();
        this.disposables.length = 0;
        this.glowSprites.length = 0;
        this.beacons.length = 0;
        this.flares.length = 0;
        this.nebulae.length = 0;
        this.group.removeFromParent();
        this.group.clear();
    }

    // ---------- Процедурные текстуры (канвас, стаб в тестах поддерживает) ----------

    private static makeGlowTexture(): THREE.CanvasTexture {
        const cv = document.createElement('canvas');
        cv.width = 128;
        cv.height = 128;
        const ctx = cv.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D unavailable.');
        const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grd.addColorStop(0, 'rgba(255,255,255,0.5)');
        grd.addColorStop(0.35, 'rgba(255,255,255,0.16)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(cv);
    }

    private static makeHaloTexture(): THREE.CanvasTexture {
        const cv = document.createElement('canvas');
        cv.width = 256;
        cv.height = 256;
        const ctx = cv.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D unavailable.');
        const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        g.addColorStop(0, 'rgba(180,110,60,0.45)');
        g.addColorStop(0.4, 'rgba(90,45,25,0.15)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 256);
        return new THREE.CanvasTexture(cv);
    }

    private static makeDiskGlowTexture(): THREE.CanvasTexture {
        const cv = document.createElement('canvas');
        cv.width = 256;
        cv.height = 256;
        const ctx = cv.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D unavailable.');
        const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        g.addColorStop(0, 'rgba(140,85,45,0.55)');
        g.addColorStop(0.35, 'rgba(70,40,30,0.20)');
        g.addColorStop(0.7, 'rgba(25,25,40,0.07)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 256);
        return new THREE.CanvasTexture(cv);
    }

    private static makeBeaconTexture(): THREE.CanvasTexture {
        const s = 256;
        const cv = document.createElement('canvas');
        cv.width = s;
        cv.height = s;
        const ctx = cv.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D unavailable.');
        const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        g.addColorStop(0, 'rgba(255,70,50,0.9)');
        g.addColorStop(0.3, 'rgba(150,20,15,0.35)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
        const tex = new THREE.CanvasTexture(cv);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    private static makeFlareTexture(): THREE.CanvasTexture {
        const s = 256;
        const cv = document.createElement('canvas');
        cv.width = s;
        cv.height = s;
        const ctx = cv.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D unavailable.');
        ctx.globalCompositeOperation = 'lighter';
        const line = (rot: number, len: number, thick: number, alpha: number): void => {
            ctx.save();
            ctx.translate(s / 2, s / 2);
            ctx.rotate(rot);
            const g = ctx.createLinearGradient(-len, 0, len, 0);
            g.addColorStop(0, 'rgba(0,0,0,0)');
            g.addColorStop(0.5, `rgba(255,238,214,${alpha})`);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(-len, -thick / 2, len * 2, thick);
            ctx.restore();
        };
        line(0, s * 0.48, 3, 0.85);
        line(Math.PI / 2, s * 0.48, 3, 0.85);
        const rg = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s * 0.12);
        rg.addColorStop(0, 'rgba(255,230,200,.9)');
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, s, s);
        const tex = new THREE.CanvasTexture(cv);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }
}
