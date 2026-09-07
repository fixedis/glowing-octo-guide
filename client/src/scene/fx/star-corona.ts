// client/src/scene/fx/star-corona.ts
//
// КОРОНА ЗВЕЗДЫ: BackSide-оболочка с фресневским свечением (additive).
//
// Пожелания юзера (2026-08-26):
//  - ТОНКИЙ ореол: оболочка 1.09R + резкое гашение наружу (pow ~5);
//  - ПО ВСЕМУ КРУГУ: сплошное базовое кольцо у лимба (не зависит от шума);
//  - РВАНЫЙ КАК ОГОНЬ: поверх кольца — языки пламени. Шум по ОБЪЕКТНОМУ
//    направлению (стабилен при облёте камеры), порог языка растёт с
//    высотой над лимбом -> у основания сплошняк, выше — редкие пики;
//  - шум течёт во времени -> пламя живёт и трепещет.
//
// fx-контракт проекта: update(time) / setOpacity(o) / dispose().

import * as THREE from 'three';

/** База радиуса оболочки относительно звезды; итог рандомится от сида. */
const SHELL_SCALE_BASE = 1.12;

const CORONA_VERT = /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec3 vDir;
    // МИРОВАЯ нормаль: фреснель обязан считаться в мире вместе с viewDir
    // (смешение view-space нормали и мирового направления давало асимметрию
    // «полукруга», плывущую с наклоном камеры).
    varying vec3 vWorldNormal;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
    }
`;

const CORONA_FRAG = /* glsl */ `
    uniform float uTime;
    uniform float uOpacity;
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform float uEdgeGain;
    // Рандом горения (от сида звезды): мелкость языков, скорость пламени,
    // профиль спада, сила базы/языков, частота дыхания.
    uniform float uNoiseScale;
    uniform float uFlowSpeed;
    uniform float uEdgePow;
    uniform float uBaseGlow;
    uniform float uTongueGain;
    uniform float uBreatheSpeed;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec3 vDir;
    varying vec3 vWorldNormal;

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
        for (int n = 0; n < 3; n++) {
            v += a * noise(p);
            p = p * 2.07 + vec3(11.3, 5.7, 3.1);
            a *= 0.5;
        }
        return v;
    }

    void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        // BackSide-оболочка: мировая нормаль направлена ОТ камеры, инвертируем.
        // Фреснель полностью в мировых координатах — симметричен на все 360°.
        float ndv = clamp(dot(-normalize(vWorldNormal), viewDir), 0.0, 1.0);

        // band: пик свечения сидит ПОД диском звезды (нормировка к ~0.69
        // от лимба) — снаружи остаётся лишь монотонный спад, отдельной
        // яркой полосы у края нет, ореол сливается с ободком звезды.
        float band = clamp(ndv * uEdgeGain * 0.69, 0.0, 1.0);
        // Высота над лимбом: 0 = у диска, 1 = край оболочки.
        float h = 1.0 - band;

    // Пламя: языки ВЫТЕКАЮТ от середины (лимба) к краям (юзер).
    // Фаза шума привязана к высоте h и течёт наружу со временем —
    // изолинии узора ползут от диска к краю оболочки непрерывно.
    vec3 dom = vDir * uNoiseScale;
    dom.z += h * 4.5 - uTime * 1.35 * uFlowSpeed;
    float n = fbm(dom);

    // Рваные языки: порог растёт с высотой, сила языков — юниформ (рандом).
    float thr = mix(0.08, 0.55, h * h);
    float tongue = smoothstep(thr, thr + 0.24, n);

    // Сплошное основание по всему кругу + языки сверху. Пик под диском,
    // снаружи — монотонный спад; база держит кольцо ярким на 360°.
    float glow = pow(band, uEdgePow) * (uBaseGlow + uTongueGain * tongue);
    // ЖЁСТКОЕ гашение ДО края оболочки: ниже band < 0.24 свечение уходит
    // в ноль плавно, но гарантированно — иначе внешняя граница оболочки
    // видна как кольцо («выглядит как сатурн», юзер).
    glow *= smoothstep(0.0, 0.24, band);
    // Лёгкое дыхание общей яркости (частота тоже рандомится).
    glow *= 0.90 + 0.10 * sin(uTime * uBreatheSpeed);

        float a = glow * uIntensity;
        gl_FragColor = vec4(uColor * a, a * uOpacity);
        if (gl_FragColor.a < 0.003) discard;
    }
`;

export interface StarCorona {
    readonly mesh: THREE.Mesh;
    /** Радиус оболочки относительно звезды (для подстройки под размер). */
    setScale(radiusScale: number): void;
    update(time: number): void;
    /** Прозрачность короны 0..1 (следует за каналом солнца). */
    setOpacity(opacity: number): void;
    dispose(): void;
}

/** Пресет горения короны (эталоны юзера из живой настройки). */
export interface CoronaPreset {
    readonly width: number;
    readonly noiseScale: number;
    readonly flowSpeed: number;
    readonly edgePow: number;
    readonly baseGlow: number;
    readonly tongueGain: number;
    readonly breatheSpeed: number;
    readonly intensity: number;
}

export function createStarCorona(
    starRadius: number,
    color: THREE.ColorRepresentation,
    p: CoronaPreset,
): StarCorona {
    // Плотная тесселяция: силуэт оболочки без фасеток. Ширина слоя — из пресета.
    // shellScale хранит относительный радиус оболочки (для setScale()).
    const shellScale = p.width;
    const geometry = new THREE.SphereGeometry(starRadius * shellScale, 96, 48);

    // gain нормирует ndv у силуэта звезды в единицу: максимум свечения
    // прижат к диску, к краю оболочки — ноль (границы не видно).
    const r = 1 / p.width;
    const edgeGain = 1 / Math.sqrt(Math.max(1e-4, 1 - r * r));

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uOpacity: { value: 1 },
            uColor: { value: new THREE.Color(color) },
            uIntensity: { value: p.intensity },
            uEdgeGain: { value: edgeGain },
            uNoiseScale: { value: p.noiseScale },
            uFlowSpeed: { value: p.flowSpeed },
            uEdgePow: { value: p.edgePow },
            uBaseGlow: { value: p.baseGlow },
            uTongueGain: { value: p.tongueGain },
            uBreatheSpeed: { value: p.breatheSpeed },
        },
        vertexShader: CORONA_VERT,
        fragmentShader: CORONA_FRAG,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 1;

    return {
        mesh,
        setScale(radiusScale: number): void {
            mesh.scale.setScalar(radiusScale / shellScale);
        },
        update(time: number): void {
            material.uniforms.uTime!.value = time;
        },
        setOpacity(opacity: number): void {
            material.uniforms.uOpacity!.value = Math.max(0, Math.min(1, opacity));
        },
        dispose(): void {
            geometry.dispose();
            material.dispose();
        },
    };
}
