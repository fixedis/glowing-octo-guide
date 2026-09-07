// client/src/scene/fx/star-surface.ts
//
// КРАСИВЫЕ СОЛНЦА РАЗНЫХ ТИПОВ: процедурная поверхность звезды по
// спектральному классу O..M (шейдер на самой сфере, БЕЗ glow-спрайтов —
// запрет юзера на спрайт-свечение соблюдён).
//
// Что даёт шейдер:
//  - грануляция конвективных ячей (3D value-noise fbm по позиции сферы);
//  - живой поток плазмы: два слоя шума текут в противоположные стороны;
//  - температурная палитра типа: глубокий -> средний -> горячий тон;
//  - лимбное затемнение к краю диска + мягкий эмиссивный ободок;
//  - у холодных (K/M) ячейки крупнее и медленнее, у M — вспышки
//    (пятна высокой частоты, вспыхивающие от второго слоя шума);
//  - ЗВЁЗДНЫЕ ПЯТНА: низкочастотный шум с жёстким порогом — тёмные области,
//    частота растёт к холодным классам (M пятнистая, A/B почти чистые);
//  - ПРОТУБЕРАНЦЫ на лимбе: rim-ободок модулируется угловым шумом —
//    по краю диска пляшут языки плазмы, рисунок свой у каждой звезды;
//  - ДИФФЕРЕНЦИАЛЬНОЕ ВРАЩЕНИЕ: домен шума вращается по широте —
//    экватор течёт быстрее полюсов, плазма живёт как настоящая.
//
// Детерминизм: параметры слегка джиттерятся от сида звезды — звёзды одного
// класса похожи, но не близнецы.

import * as THREE from 'three';
import type { SpectralType } from '../../core/types.js';

/** Параметры внешности звезды для каждого спектрального класса. */
interface StarLook {
    readonly deep: number;
    readonly mid: number;
    readonly hot: number;
    readonly rim: number;
    /** Размер конвективных ячеек (больше = мельче ячейки). */
    readonly cellScale: number;
    /** Скорость потока плазмы. */
    readonly flowSpeed: number;
    /** Общая яркость эмиссии. */
    readonly brightness: number;
    /** Сила вспышек (существенна только у K/M). */
    readonly flares: number;
    /** Доля поверхности, покрытой тёмными пятнами (0..1). */
    readonly spots: number;
    /** Сила протуберанцев на лимбе (модуляция ободка). */
    readonly prominences: number;
}

const LOOKS: Record<SpectralType, StarLook> = {
    // O/B/A/F/G/K/M. Палитра сдвинута в ЖЁЛТЫЙ спектр (юзер): холодные
    // классы мягче и светлее, тёплые — золотистее, M — оранжевый вместо
    // глубокого красного. Классы остаются различимы.
    O: { deep: 0x3452c9, mid: 0x7d97ff, hot: 0xf2f2ff, rim: 0xa8bcff, cellScale: 6.5, flowSpeed: 1.5, brightness: 1.75, flares: 0.55, spots: 0.05, prominences: 0.35 },
    B: { deep: 0x4158d6, mid: 0x99abff, hot: 0xf6f5ff, rim: 0xb8c6ff, cellScale: 5.8, flowSpeed: 1.3, brightness: 1.65, flares: 0.60, spots: 0.07, prominences: 0.30 },
    A: { deep: 0x9aa2de, mid: 0xe2e4fa, hot: 0xffffff, rim: 0xecf0ff, cellScale: 5.0, flowSpeed: 1.15, brightness: 1.55, flares: 0.65, spots: 0.11, prominences: 0.25 },
    F: { deep: 0xeec368, mid: 0xfff5d8, hot: 0xfffff6, rim: 0xfff3ce, cellScale: 4.4, flowSpeed: 1.0, brightness: 1.48, flares: 0.70, spots: 0.24, prominences: 0.35 },
    G: { deep: 0xe07a16, mid: 0xffd262, hot: 0xfff8d2, rim: 0xffc048, cellScale: 3.8, flowSpeed: 0.9, brightness: 1.40, flares: 0.80, spots: 0.36, prominences: 0.45 },
    K: { deep: 0xc85612, mid: 0xffa83a, hot: 0xffe2a4, rim: 0xffaa44, cellScale: 3.0, flowSpeed: 0.72, brightness: 1.32, flares: 0.95, spots: 0.48, prominences: 0.60 },
    M: { deep: 0x962a0a, mid: 0xf26828, hot: 0xffb268, rim: 0xf87a32, cellScale: 2.4, flowSpeed: 0.55, brightness: 1.18, flares: 1.15, spots: 0.58, prominences: 0.80 },
};

/** Угол поворота звезды вокруг оси Y для дифференциального вращения:
 *  экватор оборачивается за ~90 сек, полюса в ~2.2 раза медленнее. */
const SPIN_EQ = 0.07; // рад/с экватора
const SPIN_LAT_FACTOR = 2.2; // во сколько раз полюс медленнее

/** Детерминированный LCG (единый стиль проекта). */
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

const VERT = /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec3 vObjPos;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vObjPos = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
    }
`;

/** Во сколько раз полюс медленнее экватора (GLSL-копия TS-константы). */
const FRAG = /* glsl */ `
    const float SPIN_LAT_FACTOR = 2.2;
    uniform float uTime;
    uniform float uOpacity;
    uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uHot; uniform vec3 uRim;
    uniform float uCellScale;
    uniform float uFlowSpeed;
    uniform float uBrightness;
    uniform float uFlares;
    uniform float uSpots;
    uniform float uProminences;
    uniform float uSpinEq;
    uniform float uSeedShift;
    uniform mat3 uTilt;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec3 vObjPos;

    float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                       mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                       mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        for (int n = 0; n < 4; n++) {
            v += a * noise(p);
            p = p * 2.07 + vec3(11.3, 5.7, 3.1);
            a *= 0.5;
        }
        return v;
    }

    void main() {
        // СЛУЧАЙНАЯ ОСЬ ВРАЩЕНИЯ (замечание юзера «от солнца к солнцу»):
        // пер-звёздная матрица наклона задаёт, где у ЭТОЙ звезды полюса.
        vec3 q = uTilt * vObjPos;
        float t = uTime * uFlowSpeed;
        // Дифференциальное вращение ПЕРЕНЕСЕНО на физический меш звезды:
        // SystemRenderer крутит mesh вокруг той же наклонённой оси. Здесь
        // домен зафиксирован в объектных координатах и вращается вместе с
        // геометрией как твёрдое тело (без двойного счёта скорости).
        float lat = clamp(q.y, -1.0, 1.0);

        // Единый домен: грануляция, пятна и протуберанцы вращаются ВМЕСТЕ
        // с геометрией (физическое вращение меша, см. SystemRenderer).
        vec3 p = q * uCellScale;

        // Два слоя грануляции, текущие навстречу: «кипение» плазмы.
        float n1 = fbm(p + vec3(t * 0.35, t * 0.22, -t * 0.28));
        float n2 = fbm(p * 1.9 - vec3(t * 0.27, -t * 0.31, t * 0.19));
        float cells = clamp(n1 * 0.62 + n2 * 0.48, 0.0, 1.0);

        // Температурная палитра: тёмные впадины -> средний -> горячие пики.
        float heat = smoothstep(0.22, 0.82, cells);
        vec3 col = mix(uDeep, uMid, heat);
        col = mix(col, uHot, smoothstep(0.62, 0.97, cells));

        // Вспышки: редкие яркие пятна у холодных звёзд (пульсирующие).
        if (uFlares > 0.01) {
            // Домен на q: та же частота, что раньше, но вращается со звездой.
            float spot = fbm(q * 5.3 + vec3(-t * 0.5, t * 0.4, t * 0.33));
            float burst = smoothstep(0.78, 0.93, spot) * (0.6 + 0.4 * sin(uTime * 2.1 + spot * 21.0));
            col += uHot * burst * uFlares * 1.6;
        }

        // Звёздные пятна: крупный шум с жёстким порогом -> тёмные области.
        // Пятно слегка «ползёт» вместе с вращением (тот же домен spin).
        // Тон пятна = ЗАТЕМНЁННЫЙ СРЕДНИЙ цвет звезды (не чёрный uDeep):
        // класс звезды остаётся читаемым даже при плотном покрытии.
        if (uSpots > 0.01) {
            float sp = fbm(p * 0.55 + vec3(31.7, 17.3, 9.1));
            float dark = smoothstep(1.0 - uSpots * 0.55, 1.0 - uSpots * 0.25, sp);
            col = mix(col, mix(uMid, uDeep, 0.45) * 0.72, dark * 0.8);
        }

        // Лимбное затемнение + мягкий эмиссивный ободок (часть самой сферы,
        // НЕ спрайт-свечение).
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float ndv = clamp(dot(normalize(vNormal), viewDir), 0.0, 1.0);
        float limb = 0.55 + 0.45 * ndv;
        // Протуберанцы: ободок модулируется угловым шумом вокруг оси Y —
        // языки плазмы пляшут по краю диска, рисунок детерминирован сидом
        // (uSeedShift) и медленно дрейфует со временем.
        float ang = atan(q.z, q.x);
        float prom = fbm(vec3(cos(ang), sin(ang), lat * 0.7) * 3.1
            + vec3(uTime * 0.11 + uSeedShift, -uTime * 0.083, uSeedShift * 0.5));
        float rim = pow(1.0 - ndv, 2.6)
            * (1.0 - uProminences + uProminences * (0.35 + 1.3 * prom));

        vec3 outCol = col * uBrightness * limb + uRim * rim * 0.55;
        // ЯВНАЯ прозрачность (ShaderMaterial НЕ применяет material.opacity
        // сам): зум-гашение и перелёты управляют видимостью через uOpacity.
        gl_FragColor = vec4(outCol * uOpacity, uOpacity);
    }
`;

export interface StarSurface {
    readonly material: THREE.ShaderMaterial;
    update(time: number): void;
    /** Прозрачность звезды 0..1 (зум-гашение / фазы перелётов). */
    setOpacity(opacity: number): void;
    dispose(): void;
}

/** Материал поверхности звезды для спектрального класса (детерминирован сидом). */
export function createStarSurface(spectral: SpectralType, seed: number): StarSurface {
    const look = LOOKS[spectral];
    const rng = makeRng('star/' + seed + '/surface');
    // Лёгкий джиттер: звёзды одного класса не близнецы.
    // СИЛА КРУЧЕНИЯ ПЛАЗМЫ — сильно рандомная (юзер): течение 0.7..1.3x,
    // вращение 0.4..2.0x + случайный знак направления.
    const cellScale = look.cellScale * (0.92 + rng() * 0.16);
    const flowSpeed = look.flowSpeed * (0.7 + rng() * 0.6);
    // Фаза вращения/пятен и рисунок лимба — свой у каждой звезды.
    const seedShift = rng() * Math.PI * 2;
    // СЛУЧАЙНАЯ ОСЬ ВРАЩЕНИЯ: наклон оси от сида + случайное направление.
    // Ось = поворот Y на tilt вокруг X, затем на yaw вокруг Y; знак —
    // направление закручивания (по/против часовой) — тоже из сида.
    const tiltX = (rng() - 0.5) * Math.PI * 0.9; // до ±81°
    const yawY = rng() * Math.PI * 2;
    const spinSign = rng() < 0.5 ? -1 : 1;
    const cx = Math.cos(tiltX); const sx = Math.sin(tiltX);
    const cy = Math.cos(yawY); const sy = Math.sin(yawY);
    // Rx(tilt)·Ry(yaw): строки-базисы для mat3 (column-major).
    const uTiltMatrix = new THREE.Matrix3().set(
        cy, sx * sy, cx * sy,
        0, cx, -sx,
        -sy, sx * cy, cx * cy,
    );

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uOpacity: { value: 1 },
            uDeep: { value: new THREE.Color(look.deep) },
            uMid: { value: new THREE.Color(look.mid) },
            uHot: { value: new THREE.Color(look.hot) },
            uRim: { value: new THREE.Color(look.rim) },
            uCellScale: { value: cellScale },
            uFlowSpeed: { value: flowSpeed },
            uBrightness: { value: look.brightness },
            uFlares: { value: look.flares },
            uSpots: { value: look.spots },
            uProminences: { value: look.prominences * (0.9 + rng() * 0.2) },
            uSpinEq: { value: 0.07 * (0.4 + rng() * 1.6) * spinSign },
            uSeedShift: { value: seedShift },
            uTilt: { value: uTiltMatrix },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
    });

    return {
        material,
        update(time: number): void {
            material.uniforms.uTime!.value = time;
        },
        setOpacity(opacity: number): void {
            const o = Math.max(0, Math.min(1, opacity));
            material.uniforms.uOpacity!.value = o;
            // Дублируем в материал для согласованности пайплайна three.
            material.opacity = o;
        },
        dispose(): void {
            material.dispose();
        },
    };
}
