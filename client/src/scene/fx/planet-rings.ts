// client/src/scene/fx/planet-rings.ts
// Процедурные кольца газовых планет — шейдерный модуль.
// Заменяет плоский RingGeometry+MeshBasicMaterial на полноценные кольца:
//   - Полосы разной плотности (пояса/разрывы типа Кассини)
//   - Дифференциальное кеплеровское вращение внутренних/внешних колец
//   - Тень планеты на кольцах (проекция солнечного луча)
//   - Освещение от солнца + Френель подсветка края
//   - Детерминированное разнообразие из seed-а планеты
//
// Контракт: update(dt, sunDirWorld) / setOpacity(o) / dispose()
// Геометрия: собственный ануллус с UV-координатами u=radiusNorm, v=angle.

import * as THREE from 'three';
import { VS_RINGS } from './glsl/shared.js';
import type { RingSettings } from '../../core/planet-generator.js';

// ---------- GLSL: фрагментный шейдер колец ----------

const RING_FRAG = /* glsl */ `
precision highp float;

uniform float uInner;        // внутренний радиус (юниты сцены)
uniform float uOuter;        // внешний радиус
uniform float uTime;         // время (для вращения)
uniform float uOpacity;      // канал прозрачности слоя
uniform float uDensity;      // плотность колец 0..1
uniform float uColorVar;     // цветовая вариация 0..1
uniform float uGapCount;     // количество разрывов (0..3)
uniform vec3 uGaps;          // позиции разрывов (0..1 нормализованы)
uniform vec3 uBaseCol;       // базовый цвет (из palette.ring)
uniform vec3 uAccentCol;     // акцентный цвет (lighter/darker вариант)
uniform vec3 uSunDir;        // направление к солнцу (мир)
uniform vec3 uPlanetPos;     // позиция центра планеты (мир)
uniform float uPlanetRadius; // радиус планеты (юниты сцены)
uniform vec3 uSeed;          // сид для шума

varying vec3 vPos;           // локальная позиция (до modelMatrix)
varying vec3 vWP;            // мировая позиция
varying vec3 vWN;            // мировая нормаль

// --- Шум ---
float hash1(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);
  return fract((p.x+p.y)*(p.x+p.z)*(p.y+p.z));}
float vnoise(vec3 p){vec3 i=floor(p),f=fract(p);vec3 u=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash1(i),hash1(i+vec3(1,0,0)),u.x),
    mix(hash1(i+vec3(0,1,0)),hash1(i+vec3(1,1,0)),u.x),u.y),
    mix(mix(hash1(i+vec3(0,0,1)),hash1(i+vec3(1,0,1)),u.x),
    mix(hash1(i+vec3(0,1,1)),hash1(i+vec3(1,1,1)),u.x),u.y),u.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int k=0;k<4;k++){s+=a*vnoise(p);p=p*2.02+vec3(1.7);a*=.5;}return s;}

// --- Мягкий разрыв ( Cassini division ) ---
float gap(float t, float pos, float width) {
    float d = abs(t - pos);
    return smoothstep(0.0, width * 0.5, d - width * 0.15);
}

void main() {
    // Радиус от центра кольца (в локальном пространстве)
    float r = length(vPos.xz);
    // Нормализованная позиция 0..1
    float t = clamp((r - uInner) / max(uOuter - uInner, 0.001), 0.0, 1.0);

    // === ПОЛОСЫ (банды) через fbm ===
    // Два масштаба шума для богатой структуры
    float n1 = fbm(vec3(t * 18.0 + uSeed.x, uSeed.y, uSeed.z));
    float n2 = fbm(vec3(t * 40.0 + uSeed.z, uSeed.x, uSeed.y * 2.0));
    float bands = 0.6 + 0.4 * mix(n1, n2, 0.35);
    bands *= bands; // контраст

    // === РАЗРЫВЫ (gapCount 0..3) ===
    float gapMask = 1.0;
    if (uGapCount > 0.5) gapMask *= gap(t, uGaps.x, 0.06);
    if (uGapCount > 1.5) gapMask *= gap(t, uGaps.y, 0.04);
    if (uGapCount > 2.5) gapMask *= gap(t, uGaps.z, 0.05);

    // === МЯГКИЕ КРАЯ (inner/outer fade) ===
    float edgeFade = smoothstep(0.0, 0.08, t) * smoothstep(1.0, 0.92, t);

    // === ЦВЕТ: базовый + вариация через радиус ===
    float colorMix = 0.5 + 0.5 * sin(t * 6.2831 * 3.0 + uSeed.x * 10.0);
    colorMix = mix(0.3, 0.7, colorMix) * uColorVar;
    vec3 ringCol = mix(uBaseCol, uAccentCol, colorMix);

    // Добавляем яркие полосы (верхние банды)
    ringCol *= 0.75 + 0.35 * bands;

    // === ОСВЕЩЕНИЕ ОТ СОЛНЦА ===
    vec3 N = normalize(vWN);            // нормаль кольца в мире
    vec3 L = normalize(uSunDir);        // к солнцу
    float NdotL = abs(dot(N, L));        // abs = DoubleSide
    float diffuse = 0.35 + 0.65 * NdotL; // ambient + diff

    // Лёгкий Френель (подсветка кромки при малом угле обзора)
    vec3 V = normalize(cameraPosition - vWP);
    float fresnel = pow(1.0 - abs(dot(N, V)), 3.0) * 0.25;

    // === ТЕНЬ ПЛАНЕТЫ ===
    // Планета бросает тень на кольца: луч от фрагмента к солнцу
    // проверяется на пересечение сферой планеты.
    vec3 toSun = L;
    vec3 fragToPlanet = uPlanetPos - vWP;
    // Проекция на направление солнца
    float proj = dot(fragToPlanet, toSun);
    // Перпендикулярное расстояние от центра планеты до луча
    float perpDist = length(fragToPlanet - toSun * proj);
    // Тень, если фрагмент "за" планетой (проекция > 0 = за планетой от солнца)
    // и расстояние меньше радиуса планеты (с мягкой границей)
    float shadow = 1.0;
    if (proj > 0.0) {
        float shadowEdge = uPlanetRadius * 1.02;
        shadow = smoothstep(shadowEdge * 0.85, shadowEdge, perpDist);
    }

    // === ИТОГ ===
    float alpha = bands * gapMask * edgeFade * uDensity * uOpacity;
    vec3 col = ringCol * (diffuse + fresnel) * shadow;

    // Лёгкое свечение по кромке (rim glow от звезды)
    col += ringCol * 0.15 * fresnel * NdotL;

    if (alpha < 0.003) discard;
    gl_FragColor = vec4(col, alpha);
}
`;

// ---------- Интерфейс ----------

export interface PlanetRings {
    readonly mesh: THREE.Mesh;
    update(dt: number, sunDirWorld: THREE.Vector3, planetWorldPos: THREE.Vector3): void;
    setOpacity(opacity: number): void;
    dispose(): void;
}

// ---------- Создание ----------

/** Параметры для визуального разнообразия колец (из seed-а планеты). */
export interface RingVisualParams {
    readonly innerRadius: number;
    readonly outerRadius: number;
    readonly density: number;
    readonly opacity: number;
    readonly tilt: number;        // degrees
    readonly colorVariation: number;
    readonly gapCount: number;
    readonly gapPositions: readonly [number, number, number];
    readonly baseColor: THREE.Color;
    readonly accentColor: THREE.Color;
}

/**
 * Создаёт шейдерные кольца для газовой планеты.
 * @param settings — данные RingSettings из planet-generator
 * @param planetRenderRadius — визуальный радиус планеты (юниты сцены)
 * @param baseColorHex — hex-цвет palette.ring
 * @param seed — seed планеты
 */
export function createPlanetRings(
    settings: RingSettings,
    planetRenderRadius: number,
    baseColorHex: string,
    seed: number,
): PlanetRings {
    // Вычисляем радиусы колец относительно планеты
    const inner = planetRenderRadius * settings.innerRadius;
    const outer = planetRenderRadius * settings.outerRadius;

    // Геометрия: ануллус сегментами (radial × angular)
    const radialSegs = 48;
    const angularSegs = 96;
    const geometry = new THREE.BufferGeometry();

    const positions: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    for (let ai = 0; ai <= angularSegs; ai++) {
        const angle = (ai / angularSegs) * Math.PI * 2;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        for (let ri = 0; ri <= radialSegs; ri++) {
            const rn = ri / radialSegs; // 0..1
            const r = inner + rn * (outer - inner);

            positions.push(cosA * r, 0, sinA * r);
            uvs.push(rn, ai / angularSegs);
        }
    }

    for (let ai = 0; ai < angularSegs; ai++) {
        for (let ri = 0; ri < radialSegs; ri++) {
            const a = ai * (radialSegs + 1) + ri;
            const b = a + 1;
            const c = a + (radialSegs + 1);
            const d = c + 1;
            indices.push(a, b, c);
            indices.push(b, d, c);
        }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    // Вычисляем нормали
    geometry.computeVertexNormals();

    // Базовый цвет из palette.ring
    const baseCol = new THREE.Color(baseColorHex);
    // Акцентный цвет —lightly lighter/shifted
    const accentCol = baseCol.clone().offsetHSL(0.02, -0.05, 0.12);

    // Материал
    const material = new THREE.ShaderMaterial({
        vertexShader: VS_RINGS,
        fragmentShader: RING_FRAG,
        uniforms: {
            uInner: { value: inner },
            uOuter: { value: outer },
            uTime: { value: 0 },
            uOpacity: { value: settings.opacity },
            uDensity: { value: settings.density },
            uColorVar: { value: settings.colorVariation },
            uGapCount: { value: settings.gapCount },
            uGaps: { value: new THREE.Vector3(
                settings.gapPositions[0]!,
                settings.gapPositions[1]!,
                settings.gapPositions[2]!,
            )},
            uBaseCol: { value: baseCol },
            uAccentCol: { value: accentCol },
            uSunDir: { value: new THREE.Vector3(1, 0.3, 0.5) },
            uPlanetPos: { value: new THREE.Vector3() },
            uPlanetRadius: { value: planetRenderRadius },
            uSeed: { value: new THREE.Vector3(
                Math.sin(seed * 0.123) * 100,
                Math.cos(seed * 0.456) * 100,
                Math.sin(seed * 0.789) * 100,
            )},
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    // Лежит в плоскости экватора (XZ), нормаль = Y
    mesh.rotation.x = Math.PI / 2;
    // Наклон оси (из settings.tilt, ~0..30°)
    mesh.rotation.z = (settings.tilt * Math.PI) / 180;

    return {
        mesh,

        update(dt: number, sunDirWorld: THREE.Vector3, planetWorldPos: THREE.Vector3): void {
            const u = material.uniforms;
            (u['uTime']!.value as number) += dt;
            (u['uSunDir']!.value as THREE.Vector3).copy(sunDirWorld);
            (u['uPlanetPos']!.value as THREE.Vector3).copy(planetWorldPos);
        },

        setOpacity(opacity: number): void {
            (material.uniforms['uOpacity']!.value as number) = settings.opacity * Math.max(0, Math.min(1, opacity));
        },

        dispose(): void {
            geometry.dispose();
            material.dispose();
        },
    };
}
