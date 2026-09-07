// client/src/scene/fx/planet-surface.ts
// ПРОЦЕДУРНАЯ ПОВЕРХНОСТЬ ПЛАНЕТЫ (вариант из earth_3d.html, адаптированный
// под куб-квадтри нанит-меша: направление d = cubeDir(aFace, aUV), непрерывное
// по всей сфере, без разрывов на рёбрах куба).
//
// Графика строится детерминированно из variant планеты (сервер отдаёт variant,
// клиент НЕ считает его — совпадение по seed). NaniteEngine графику не считает.

import * as THREE from 'three';
import type { Planet } from '../../core/types.js';
import { planetGenerator, type GeneratedPlanet } from '../../core/planet-generator.js';
import { GLSL_NOISE } from './glsl/noise.js';
import { GLSL_HURRICANES } from './glsl/hurricanes.js';
import { VS_NANITE } from './glsl/shared.js';

// Палитра по умолчанию (earth_like) — на случай отсутствия LOOK-пресета.
const DEFAULT_PALETTE: Record<string, [number, number, number]> = {
    ocDeep: [0.015, 0.07, 0.19], ocShelf: [0.03, 0.15, 0.30], ocTurq: [0.05, 0.27, 0.35], ocShore: [0.16, 0.38, 0.42],
    landDry: [0.44, 0.37, 0.25], landLow: [0.19, 0.29, 0.14], landHigh: [0.34, 0.29, 0.19], rock: [0.29, 0.26, 0.23], snow: [0.85, 0.88, 0.92],
    cloud: [0.90, 0.92, 0.95], cloud2: [0.78, 0.82, 0.88], atmo: [0.34, 0.54, 0.85],
};

/** Пресеты палитр/конфигов из прототипа (LOOK), индексированные по variant. */
const LOOK: Record<string, { cfg: Record<string, number>; col: Record<string, [number, number, number]> }> = {
    earth_like: {
        cfg: { sea: 0.47, water: 1, iceCaps: 0.5, cloud: 0.6, cloudType: 1, atmoInt: 0.5, craters: 0, lava: 0, cities: 1, bump: 0.8 },
        col: DEFAULT_PALETTE,
    },
    gas_giant: {
        cfg: { sea: 0.5, water: 0, iceCaps: 0, cloud: 0.9, cloudType: 3, cloudBands: 12, cloudVortex: 0.5, atmoInt: 0.3, craters: 0, lava: 0, cities: 0, bump: 0.3, opaqueClouds: 1 },
        col: {
            cloud: [0.85, 0.78, 0.66], cloud2: [0.60, 0.46, 0.34], landDry: [0.70, 0.62, 0.50], landLow: [0.60, 0.50, 0.40], landHigh: [0.50, 0.40, 0.32],
            rock: [0.40, 0.32, 0.26], snow: [0.85, 0.80, 0.72], ocDeep: [0.50, 0.42, 0.34], ocShelf: [0.55, 0.47, 0.39], ocTurq: [0.60, 0.52, 0.44], ocShore: [0.65, 0.57, 0.49], atmo: [0.75, 0.65, 0.50],
        },
    },
    saturn_like: {
        cfg: { sea: 0.5, water: 0, iceCaps: 0, cloud: 0.9, cloudType: 3, cloudBands: 16, cloudVortex: 0.3, atmoInt: 0.25, craters: 0, lava: 0, cities: 0, bump: 0.3, opaqueClouds: 1 },
        col: {
            cloud: [0.88, 0.82, 0.68], cloud2: [0.72, 0.62, 0.46], landDry: [0.75, 0.68, 0.55], landLow: [0.65, 0.57, 0.45], landHigh: [0.55, 0.47, 0.37],
            rock: [0.45, 0.37, 0.29], snow: [0.88, 0.83, 0.74], ocDeep: [0.55, 0.47, 0.37], ocShelf: [0.60, 0.52, 0.42], ocTurq: [0.65, 0.57, 0.47], ocShore: [0.70, 0.62, 0.52], atmo: [0.80, 0.70, 0.55],
        },
    },
    ice_giant: {
        cfg: { sea: 0.5, water: 0, iceCaps: 0, cloud: 0.8, cloudType: 3, cloudBands: 8, cloudVortex: 0.6, atmoInt: 0.35, craters: 0, lava: 0, cities: 0, bump: 0.3, opaqueClouds: 1 },
        col: {
            cloud: [0.55, 0.75, 0.85], cloud2: [0.35, 0.55, 0.70], landDry: [0.45, 0.60, 0.70], landLow: [0.35, 0.50, 0.62], landHigh: [0.27, 0.42, 0.54],
            rock: [0.20, 0.32, 0.42], snow: [0.75, 0.83, 0.90], ocDeep: [0.25, 0.40, 0.52], ocShelf: [0.30, 0.45, 0.57], ocTurq: [0.35, 0.50, 0.62], ocShore: [0.40, 0.55, 0.67], atmo: [0.40, 0.60, 0.75],
        },
    },
    cold_jupiter: {
        cfg: { sea: 0.5, water: 0, iceCaps: 0, cloud: 0.9, cloudType: 3, cloudBands: 14, cloudVortex: 0.4, atmoInt: 0.3, craters: 0, lava: 0, cities: 0, bump: 0.3, opaqueClouds: 1 },
        col: {
            cloud: [0.88, 0.91, 0.95], cloud2: [0.58, 0.68, 0.82], landDry: [0.72, 0.76, 0.82], landLow: [0.62, 0.67, 0.75], landHigh: [0.52, 0.58, 0.68],
            rock: [0.42, 0.48, 0.58], snow: [0.90, 0.93, 0.96], ocDeep: [0.45, 0.52, 0.62], ocShelf: [0.50, 0.57, 0.67], ocTurq: [0.55, 0.62, 0.72], ocShore: [0.60, 0.67, 0.77], atmo: [0.60, 0.70, 0.85],
        },
    },
    hot_jupiter: {
        cfg: { sea: 0.5, water: 0, iceCaps: 0, cloud: 0.85, cloudType: 3, cloudBands: 8, cloudVortex: 0.8, atmoInt: 0.4, craters: 0, lava: 0.3, cities: 0, bump: 0.3, opaqueClouds: 1 },
        col: {
            cloud: [0.85, 0.60, 0.40], cloud2: [0.60, 0.35, 0.25], landDry: [0.70, 0.45, 0.30], landLow: [0.60, 0.36, 0.24], landHigh: [0.50, 0.28, 0.18],
            rock: [0.40, 0.20, 0.13], snow: [0.85, 0.70, 0.55], ocDeep: [0.45, 0.25, 0.15], ocShelf: [0.50, 0.30, 0.18], ocTurq: [0.55, 0.35, 0.21], ocShore: [0.60, 0.40, 0.24], atmo: [0.80, 0.45, 0.30],
        },
    },
    lava_planet: {
        cfg: { sea: 0.4, water: 0, iceCaps: 0, cloud: 0.15, cloudType: 0, atmoInt: 0.25, craters: 0, lava: 1, cities: 0, bump: 1, surfaceType: 1 },
        col: {
            landDry: [0.12, 0.09, 0.08], landLow: [0.09, 0.07, 0.06], landHigh: [0.15, 0.10, 0.08], rock: [0.07, 0.05, 0.05], snow: [0.30, 0.20, 0.15],
            ocDeep: [0.08, 0.05, 0.04], ocShelf: [0.10, 0.06, 0.05], ocTurq: [0.12, 0.07, 0.05], ocShore: [0.14, 0.08, 0.06],
            cloud: [0.35, 0.28, 0.24], cloud2: [0.30, 0.22, 0.18], atmo: [0.55, 0.25, 0.12],
        },
    },
    fire_planet: {
        cfg: { sea: 0.4, water: 0, iceCaps: 0, cloud: 0.1, cloudType: 0, atmoInt: 0.3, craters: 0, lava: 1, cities: 0, bump: 1.1, surfaceType: 1 },
        col: {
            landDry: [0.10, 0.07, 0.06], landLow: [0.08, 0.05, 0.05], landHigh: [0.13, 0.08, 0.07], rock: [0.06, 0.04, 0.04], snow: [0.28, 0.18, 0.12],
            ocDeep: [0.07, 0.04, 0.03], ocShelf: [0.09, 0.05, 0.04], ocTurq: [0.11, 0.06, 0.04], ocShore: [0.13, 0.07, 0.05],
            cloud: [0.32, 0.24, 0.20], cloud2: [0.27, 0.20, 0.16], atmo: [0.60, 0.28, 0.12],
        },
    },
    ocean_planet: {
        cfg: { sea: 0.55, water: 1, iceCaps: 0.2, cloud: 0.5, cloudType: 1, atmoInt: 0.45, craters: 0, lava: 0, cities: 0.5 },
        col: {
            ocDeep: [0.01, 0.05, 0.16], ocShelf: [0.02, 0.12, 0.26], ocTurq: [0.04, 0.22, 0.30], ocShore: [0.14, 0.34, 0.38],
            landDry: [0.40, 0.36, 0.26], landLow: [0.28, 0.26, 0.18], landHigh: [0.22, 0.20, 0.15], rock: [0.18, 0.16, 0.13], snow: [0.85, 0.88, 0.92],
            cloud: [0.90, 0.92, 0.95], cloud2: [0.80, 0.84, 0.90], atmo: [0.35, 0.55, 0.85],
        },
    },
    snowball: {
        cfg: { sea: 0.5, water: 0.3, iceCaps: 1.3, cloud: 0.3, cloudType: 1, atmoInt: 0.3, craters: 0, lava: 0, cities: 0 },
        col: {
            landDry: [0.66, 0.71, 0.79], landLow: [0.52, 0.58, 0.68], landHigh: [0.40, 0.46, 0.56], rock: [0.30, 0.35, 0.45], snow: [0.82, 0.86, 0.92],
            ocDeep: [0.10, 0.16, 0.26], ocShelf: [0.16, 0.24, 0.34], ocTurq: [0.22, 0.32, 0.42], ocShore: [0.30, 0.40, 0.50],
            cloud: [0.88, 0.91, 0.95], cloud2: [0.78, 0.82, 0.90], atmo: [0.55, 0.65, 0.80],
        },
    },
    moon: {
        cfg: { sea: 0.5, water: 0, iceCaps: 0, cloud: 0, cloudType: 0, atmoInt: 0, craters: 1, lava: 0, cities: 0, bump: 0.7, surfaceType: 6 },
        col: {
            landDry: [0.42, 0.41, 0.40], landLow: [0.30, 0.29, 0.28], landHigh: [0.22, 0.21, 0.20], rock: [0.16, 0.15, 0.14], snow: [0.55, 0.55, 0.55],
            ocDeep: [0.2, 0.2, 0.2], ocShelf: [0.25, 0.25, 0.25], ocTurq: [0.3, 0.3, 0.3], ocShore: [0.35, 0.35, 0.35],
            cloud: [0.5, 0.5, 0.5], cloud2: [0.45, 0.45, 0.45], atmo: [0.3, 0.3, 0.3],
        },
    },
    mercury_like: {
        cfg: { sea: 0.5, water: 0, iceCaps: 0, cloud: 0, cloudType: 0, atmoInt: 0, craters: 0.9, lava: 0, cities: 0, bump: 0.8, surfaceType: 6 },
        col: {
            landDry: [0.38, 0.34, 0.30], landLow: [0.27, 0.24, 0.21], landHigh: [0.19, 0.17, 0.15], rock: [0.14, 0.12, 0.11], snow: [0.5, 0.48, 0.45],
            ocDeep: [0.2, 0.18, 0.16], ocShelf: [0.24, 0.22, 0.20], ocTurq: [0.28, 0.26, 0.24], ocShore: [0.32, 0.30, 0.28],
            cloud: [0.5, 0.5, 0.5], cloud2: [0.45, 0.45, 0.45], atmo: [0.3, 0.3, 0.3],
        },
    },
    barren_rock: {
        cfg: { sea: 0.5, water: 0, iceCaps: 0, cloud: 0, cloudType: 0, atmoInt: 0, craters: 0.6, lava: 0, cities: 0, bump: 0.8, surfaceType: 6 },
        col: {
            landDry: [0.40, 0.37, 0.33], landLow: [0.29, 0.26, 0.23], landHigh: [0.20, 0.18, 0.16], rock: [0.15, 0.13, 0.12], snow: [0.5, 0.48, 0.45],
            ocDeep: [0.2, 0.18, 0.16], ocShelf: [0.24, 0.22, 0.20], ocTurq: [0.28, 0.26, 0.24], ocShore: [0.32, 0.30, 0.28],
            cloud: [0.5, 0.5, 0.5], cloud2: [0.45, 0.45, 0.45], atmo: [0.3, 0.3, 0.3],
        },
    },
    frozen_wasteland: {
        cfg: { sea: 0.5, water: 0.2, iceCaps: 1.1, cloud: 0.15, cloudType: 1, atmoInt: 0.2, craters: 0.3, lava: 0, cities: 0, surfaceType: 2 },
        col: {
            landDry: [0.62, 0.67, 0.75], landLow: [0.48, 0.54, 0.64], landHigh: [0.36, 0.42, 0.52], rock: [0.28, 0.33, 0.43], snow: [0.80, 0.84, 0.90],
            ocDeep: [0.10, 0.16, 0.26], ocShelf: [0.16, 0.24, 0.34], ocTurq: [0.22, 0.32, 0.42], ocShore: [0.30, 0.40, 0.50],
            cloud: [0.85, 0.88, 0.93], cloud2: [0.75, 0.79, 0.87], atmo: [0.50, 0.60, 0.75],
        },
    },
    icy_moon: {
        cfg: { sea: 0.5, water: 0.2, iceCaps: 1.2, cloud: 0, cloudType: 0, atmoInt: 0, craters: 0.5, lava: 0, cities: 0, surfaceType: 2 },
        col: {
            landDry: [0.60, 0.65, 0.73], landLow: [0.46, 0.52, 0.62], landHigh: [0.34, 0.40, 0.50], rock: [0.26, 0.31, 0.41], snow: [0.80, 0.84, 0.90],
            ocDeep: [0.10, 0.16, 0.26], ocShelf: [0.16, 0.24, 0.34], ocTurq: [0.22, 0.32, 0.42], ocShore: [0.30, 0.40, 0.50],
            cloud: [0.6, 0.6, 0.6], cloud2: [0.5, 0.5, 0.5], atmo: [0.3, 0.3, 0.3],
        },
    },
    volcanic_moon: {
        cfg: { sea: 0.4, water: 0, iceCaps: 0, cloud: 0, cloudType: 0, atmoInt: 0, craters: 0.4, lava: 0.8, cities: 0, bump: 0.9, surfaceType: 1 },
        col: {
            landDry: [0.55, 0.45, 0.20], landLow: [0.45, 0.35, 0.15], landHigh: [0.32, 0.25, 0.11], rock: [0.20, 0.15, 0.08], snow: [0.60, 0.52, 0.30],
            ocDeep: [0.25, 0.18, 0.08], ocShelf: [0.30, 0.22, 0.10], ocTurq: [0.35, 0.26, 0.12], ocShore: [0.40, 0.30, 0.14],
            cloud: [0.5, 0.45, 0.3], cloud2: [0.4, 0.35, 0.25], atmo: [0.4, 0.3, 0.15],
        },
    },
    titan_like: {
        cfg: { sea: 0.45, water: 0.4, iceCaps: 0, cloud: 0.7, cloudType: 2, atmoInt: 0.8, craters: 0, lava: 0, cities: 0 },
        col: {
            cloud: [0.78, 0.58, 0.28], cloud2: [0.66, 0.48, 0.22], landDry: [0.50, 0.36, 0.18], landLow: [0.40, 0.28, 0.14], landHigh: [0.30, 0.21, 0.11],
            rock: [0.24, 0.16, 0.09], snow: [0.80, 0.70, 0.55], ocDeep: [0.10, 0.07, 0.03], ocShelf: [0.14, 0.10, 0.05], ocTurq: [0.18, 0.13, 0.07], ocShore: [0.22, 0.16, 0.09], atmo: [0.83, 0.55, 0.20],
        },
    },
    tropical: {
        cfg: { sea: 0.5, water: 1, iceCaps: 0.1, cloud: 0.6, cloudType: 1, atmoInt: 0.45, craters: 0, lava: 0, cities: 0.4 },
        col: {
            ocDeep: [0.02, 0.10, 0.22], ocShelf: [0.04, 0.18, 0.32], ocTurq: [0.06, 0.26, 0.38], ocShore: [0.16, 0.34, 0.42],
            landDry: [0.38, 0.42, 0.26], landLow: [0.22, 0.30, 0.16], landHigh: [0.30, 0.29, 0.19], rock: [0.20, 0.18, 0.14], snow: [0.85, 0.88, 0.92],
            cloud: [0.90, 0.92, 0.95], cloud2: [0.80, 0.84, 0.90], atmo: [0.35, 0.55, 0.85],
        },
    },
    arid: {
        cfg: { sea: 0.4, water: 0, iceCaps: 0, cloud: 0.1, cloudType: 0, atmoInt: 0.25, craters: 0.2, lava: 0, cities: 0.3 },
        col: {
            landDry: [0.55, 0.32, 0.18], landLow: [0.43, 0.25, 0.14], landHigh: [0.30, 0.17, 0.10], rock: [0.24, 0.15, 0.10], snow: [0.85, 0.78, 0.72],
            ocDeep: [0.30, 0.18, 0.11], ocShelf: [0.36, 0.22, 0.13], ocTurq: [0.42, 0.26, 0.15], ocShore: [0.48, 0.30, 0.17],
            cloud: [0.75, 0.65, 0.55], cloud2: [0.65, 0.55, 0.45], atmo: [0.72, 0.45, 0.28],
        },
    },
    desert: {
        cfg: { sea: 0.4, water: 0, iceCaps: 0, cloud: 0.05, cloudType: 0, atmoInt: 0.18, craters: 0.4, lava: 0, cities: 0.1 },
        col: {
            landDry: [0.55, 0.32, 0.18], landLow: [0.43, 0.25, 0.14], landHigh: [0.30, 0.17, 0.10], rock: [0.24, 0.15, 0.10], snow: [0.85, 0.78, 0.72],
            ocDeep: [0.30, 0.18, 0.11], ocShelf: [0.36, 0.22, 0.13], ocTurq: [0.42, 0.26, 0.15], ocShore: [0.48, 0.30, 0.17],
            cloud: [0.75, 0.65, 0.55], cloud2: [0.65, 0.55, 0.45], atmo: [0.72, 0.45, 0.28],
        },
    },
    arctic: {
        cfg: { sea: 0.5, water: 1, iceCaps: 1.0, cloud: 0.4, cloudType: 1, atmoInt: 0.35, craters: 0, lava: 0, cities: 0.2 },
        col: {
            ocDeep: [0.10, 0.16, 0.26], ocShelf: [0.16, 0.24, 0.34], ocTurq: [0.22, 0.32, 0.42], ocShore: [0.30, 0.40, 0.50],
            landDry: [0.55, 0.62, 0.72], landLow: [0.42, 0.50, 0.62], landHigh: [0.32, 0.40, 0.52], rock: [0.26, 0.32, 0.42], snow: [0.82, 0.86, 0.92],
            cloud: [0.88, 0.91, 0.95], cloud2: [0.78, 0.82, 0.90], atmo: [0.55, 0.65, 0.80],
        },
    },
    tundra: {
        cfg: { sea: 0.5, water: 0.8, iceCaps: 0.8, cloud: 0.35, cloudType: 1, atmoInt: 0.3, craters: 0, lava: 0, cities: 0.2 },
        col: {
            ocDeep: [0.10, 0.16, 0.26], ocShelf: [0.16, 0.24, 0.34], ocTurq: [0.22, 0.32, 0.42], ocShore: [0.30, 0.40, 0.50],
            landDry: [0.52, 0.60, 0.70], landLow: [0.40, 0.48, 0.60], landHigh: [0.30, 0.38, 0.50], rock: [0.24, 0.30, 0.40], snow: [0.80, 0.84, 0.90],
            cloud: [0.85, 0.88, 0.93], cloud2: [0.75, 0.79, 0.87], atmo: [0.50, 0.60, 0.75],
        },
    },
    swamp: {
        cfg: { sea: 0.5, water: 1, iceCaps: 0, cloud: 0.5, cloudType: 1, atmoInt: 0.4, craters: 0, lava: 0, cities: 0.2 },
        col: {
            ocDeep: [0.03, 0.10, 0.16], ocShelf: [0.05, 0.18, 0.26], ocTurq: [0.07, 0.26, 0.32], ocShore: [0.16, 0.34, 0.38],
            landDry: [0.40, 0.42, 0.28], landLow: [0.30, 0.32, 0.20], landHigh: [0.22, 0.24, 0.15], rock: [0.18, 0.18, 0.12], snow: [0.82, 0.86, 0.92],
            cloud: [0.88, 0.90, 0.94], cloud2: [0.78, 0.82, 0.88], atmo: [0.40, 0.55, 0.85],
        },
    },
    savanna: {
        cfg: { sea: 0.4, water: 0, iceCaps: 0, cloud: 0.25, cloudType: 1, atmoInt: 0.3, craters: 0.1, lava: 0, cities: 0.2 },
        col: {
            landDry: [0.55, 0.45, 0.22], landLow: [0.43, 0.35, 0.16], landHigh: [0.30, 0.24, 0.11], rock: [0.24, 0.18, 0.10], snow: [0.85, 0.80, 0.72],
            ocDeep: [0.30, 0.18, 0.11], ocShelf: [0.36, 0.22, 0.13], ocTurq: [0.42, 0.26, 0.15], ocShore: [0.48, 0.30, 0.17],
            cloud: [0.78, 0.70, 0.58], cloud2: [0.68, 0.60, 0.48], atmo: [0.72, 0.50, 0.30],
        },
    },
    gaia_world: {
        cfg: { sea: 0.5, water: 1, iceCaps: 0.6, cloud: 0.6, cloudType: 1, atmoInt: 0.55, craters: 0, lava: 0, cities: 1 },
        col: {
            ocDeep: [0.015, 0.08, 0.20], ocShelf: [0.03, 0.16, 0.30], ocTurq: [0.05, 0.26, 0.36], ocShore: [0.16, 0.36, 0.42],
            landDry: [0.48, 0.40, 0.26], landLow: [0.22, 0.30, 0.16], landHigh: [0.34, 0.30, 0.20], rock: [0.26, 0.24, 0.20], snow: [0.88, 0.90, 0.94],
            cloud: [0.92, 0.94, 0.96], cloud2: [0.80, 0.84, 0.90], atmo: [0.35, 0.55, 0.85],
        },
    },
};

// --- GLSL FS_CRUST (адаптированный) -------------------------------------------

const SURFACE_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;uniform vec3 uSunDir;uniform vec3 uCam;uniform float uDriftLow;
uniform float uSea;uniform float uWater;uniform float uCities;uniform float uLava;
uniform float uIceCaps;uniform float uBump;
uniform float uSurfType;uniform float uSurfRough;uniform float uSurfGloss;uniform float uSurfDetail;
uniform float uRidgeAmount;uniform float uCrackDensity;uniform float uCraterScale;
uniform float uAnomalyType;uniform vec3 uAnomalyPos;uniform float uAnomalySize;uniform float uAnomalyIntensity;
uniform float uCraterDensity;
uniform float uCloud;
uniform float uSpecInt;
uniform vec3 uOcDeep;uniform vec3 uOcShelf;uniform vec3 uOcTurq;uniform vec3 uOcShore;
uniform vec3 uLandDry;uniform vec3 uLandLow;uniform vec3 uLandHigh;uniform vec3 uRock;uniform vec3 uSnow;
uniform vec3 uCityCol;uniform vec3 uAtmoCol;
varying vec3 vObj;varying vec3 vWN;varying vec3 vWP;varying vec3 vVN;
${GLSL_NOISE}
float terrainH(vec3 d){
  vec3 sd=d+uSeed*.05;
  float base=(fbm(sd*2.0+vec3(7.31)+uSeed)+.30*fbm(sd*5.5+vec3(3.71)+uSeed)+.15*fbm(sd*12.+vec3(1.3)+uSeed))/1.45;
  base+=uRidgeAmount*ridged(sd*4.0+uSeed)*.3;
  if(uCraterDensity>.05){
    vec3 csd=sd*3.0;
    vec3 ci=floor(csd);
    float acc=0.;
    for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){
      vec3 g=vec3(float(x),float(y),float(z));
      float rnd=hash1(ci+g);
      if(rnd>.55){
        vec3 o=hash3(ci+g+7.7);
        vec3 cpos=normalize(ci+g+o-.5);
        float csize=(.02+.05*hash1(ci+g+3.3))*uCraterScale;
        float cdepth=.3+.7*hash1(ci+g+5.1);
        acc+=craterBowl(d,cpos,csize)*cdepth;
      }
    }
    float craterBoost=(uSurfType>5.5&&uSurfType<7.5)?.35:.10;
    base+=acc*uCraterDensity*craterBoost;
  }
  return base;}
void main(){vec3 n=normalize(vWN);vec3 d=normalize(vObj);vec3 sun=normalize(uSunDir);
  float S=uSea;float h=terrainH(d);float hC=h+fbm(d*32.+1.7+uSeed)*.025;
  float land=smoothstep(S,S+.008,hC);
  float iceN=.16*(fbm(d*7.+uSeed)-.5)+.07*(fbm(d*17.+uSeed*1.7)-.5);
  float ice=clamp(smoothstep(.80,.97,abs(d.y)+iceN)*clamp(uIceCaps,0.,1.5),0.,1.);
  vec3 upv=abs(n.y)<.98?vec3(0.,1.,0.):vec3(1.,0.,0.);
  vec3 tg=normalize(cross(upv,n));vec3 bn=cross(n,tg);
  float e=.015;float h0=terrainH(d);
  float h1=terrainH(normalize(d+tg*e));float h2b=terrainH(normalize(d+bn*e));
  vec3 nn=normalize(n-(tg*(h1-h0)+bn*(h2b-h0))*(14.0*uBump*land*(1.-ice)));

  if(uAnomalyType>.5&&uAnomalyType<1.5){
    float ac=craterBowl(d,uAnomalyPos,uAnomalySize);
    nn=normalize(nn+uAnomalyPos*ac*uAnomalyIntensity*.5);
    h+=ac*uAnomalyIntensity*.3;
  }else if(uAnomalyType>1.5&&uAnomalyType<2.5){
    float dist=acos(clamp(dot(d,normalize(uAnomalyPos)),-1.,1.));
    float rift=smoothstep(uAnomalySize,uAnomalySize*.3,abs(dist-.5))*uAnomalyIntensity;
    nn=normalize(nn-tg*rift*.3);
  }else if(uAnomalyType>2.5&&uAnomalyType<3.5){
    float dist=acos(clamp(dot(d,normalize(uAnomalyPos)),-1.,1.));
    float hs=smoothstep(uAnomalySize,0.,dist)*uAnomalyIntensity;
    h+=hs*.2;
  }else if(uAnomalyType>3.5){
    float dist=acos(clamp(dot(d,normalize(uAnomalyPos)),-1.,1.));
    float basin=smoothstep(uAnomalySize,0.,dist)*uAnomalyIntensity;
    h-=basin*.15;
  }

  float nd=dot(nn,sun);float diff=.22+.78*lightFall(nd);
  vec3 snowCol=mix(uSnow*.40,uSnow,smoothstep(-.15,.30,nd));
  float night=smoothstep(.08,-.15,nd);float dayF=smoothstep(-.1,.3,nd);
  float term=smoothstep(-.15,-.02,nd)*(1.-smoothstep(.02,.3,nd));
  float coastLight=smoothstep(.03,.42,nd);

  vec3 ocW=mix(uOcDeep*.45,uOcDeep,smoothstep(S-.140,S-.100,hC));
  ocW=mix(ocW,uOcShelf,smoothstep(S-.050,S-.026,hC+.004*(fbmQ(d*40.+3.3+uSeed)-.5)));
  ocW=mix(ocW,uOcTurq,smoothstep(S-.024,S-.010,hC+.005*(fbmQ(d*55.+7.7+uSeed)-.5))*coastLight);
  ocW=mix(ocW,uOcShore,smoothstep(S-.002,S+.006,hC)*coastLight*.8);
  ocW*=.90+.18*fbmQ(d*6.+3.3+uSeed);
  vec3 ocDry=mix(uLandDry*.55,uRock*.7,fbmQ(d*8.+1.3+uSeed));
  vec3 oc=mix(ocW,ocDry,1.-uWater);
  oc=mix(oc,snowCol,ice*uWater);

  vec3 lc=uLandDry;
  float st=uSurfType;
  if(st<0.5){
    lc=mix(lc,uLandLow,smoothstep(S+.02,S+.06,h));
    lc=mix(lc,uLandHigh,smoothstep(S+.05,S+.10,h));
    lc=mix(lc,uRock,smoothstep(S+.14,S+.20,h));
    lc=mix(lc,snowCol,smoothstep(S+.20,S+.34,h+abs(d.y)*.12+iceN*.5));
    lc*=.90+.18*fbmQ(d*7.+5.5+uSeed);
  }else if(st<1.5){
    float lv=max(uLava,.55)*(1.-smoothstep(0.,.045,abs(fbmQ(d*5.+uSeed+vec3(0.,uTime*.01,0.))-.5)));
    lv*=smoothstep(.40,.70,fbmQ(d*3.+7.7+uSeed));
    lc=mix(uRock*.4,mix(vec3(.5,.03,0.),vec3(1.,.45,.08),lv),lv*1.5+0.2);
    lc+=vec3(1.,.6,.2)*lv*.7*(.15+.85*night);
  }else if(st<2.5){
    float iceDetail=.7+.6*fbmQ(d*15.+uSeed+vec3(uTime*.002));
    lc=mix(snowCol*.8,snowCol,iceDetail);
    lc=mix(lc,uOcDeep*.3,smoothstep(.82,.88,abs(d.y)));
    float cracks=1.-smoothstep(0.,.02,abs(fbmQ(d*30.+uSeed)-.5));
    lc=mix(lc,vec3(.4,.6,.8),cracks*.3*uCrackDensity);
  }else if(st<3.5){
    float dunes=.6+.8*fbm(d*8.+vec3(2.1,.3,1.7)+uSeed);
    float ripples=.7+.5*fbm(d*40.+vec3(uTime*.001)+uSeed);
    lc=mix(uLandDry,uLandDry*1.3,dunes*ripples);
    float shadow=smoothstep(.3,.7,dot(nn,normalize(vec3(.4,.3,.5))));
    lc*=.7+.5*shadow;
  }else if(st<4.5){
    float metalTexture=.5+.5*fbmQ(d*12.+uSeed);
    float scratches=.8+.4*fbmQ(d*60.+uSeed);
    lc=mix(uRock*.5,uRock*1.2,metalTexture*.5+scratches*.3);
    float specular=pow(max(dot(nn,normalize(sun+normalize(uCam-vWP))),0.),60.)*uSurfGloss*2.;
    lc+=vec3(1.)*specular;
  }else if(st<5.5){
    float bio=.5+.8*fbmQ(d*20.+uSeed+vec3(uTime*.003));
    float patches=smoothstep(.4,.7,fbmQ(d*10.+uSeed));
    lc=mix(uLandLow,uLandHigh*1.3,bio*patches);
    lc=mix(lc,vec3(.8,.4,.2),smoothstep(.6,.8,fbmQ(d*30.+7.7+uSeed))*.4);
  }else if(st<6.5){
    float cr=0.;
    vec3 sd2=d+uSeed*.1;
    vec3 i=floor(sd2*6.0);
    for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){
      vec3 g=vec3(float(x),float(y),float(z));
      vec3 o=hash3(i+g);
      if(hash1(i+g)>.45)cr+=craterBowl(d,normalize(sd2+g+o-.5),.06*uCraterScale);
    }
    lc=mix(uRock*.6,uRock*1.1,.5+cr*.6);
    lc*=.8+.4*fbmQ(d*10.+uSeed);
  }else if(st<7.5){
    float r=ridged(d*5.+uSeed);
    lc=mix(uLandLow,uLandHigh,r);
    lc=mix(lc,uRock,smoothstep(.6,.8,r));
    lc*=.7+.5*r;
  }else if(st<8.5){
    float crackNoise=fbmQ(d*12.+uSeed);
    float crackLine=1.-smoothstep(0.,.15,abs(crackNoise-.5));
    lc=mix(uLandDry,uRock*.4,crackLine*uCrackDensity);
    lc*=.8+.4*fbmQ(d*12.+uSeed);
  }else{
    float mare=smoothstep(.45,.6,fbm(d*2.5+uSeed*.3));
    vec3 bright=mix(uSnow,uLandDry,.3);
    vec3 darkm=mix(uRock*.35,uLandLow,.4);
    lc=mix(darkm,bright,mare);
    lc*=.85+.3*fbmQ(d*9.+uSeed);
    lc=mix(lc,snowCol,smoothstep(.75,.9,fbm(d*4.+uSeed+4.2))*.5);
  }
  lc=mix(lc,snowCol,ice);

  lc=mix(lc,lc*.72,smoothstep(.55,.78,fbm(d*2.2+uSeed*.3))*.55);

  vec3 albedo=mix(oc,lc,land);
  float hill=clamp(dot(nn,normalize(vec3(.6,.35,.5)))*1.5,.55,1.25);
  float ao=.85+.15*smoothstep(S-.008,S+.14,h);
  albedo=mix(albedo,albedo*mix(1.,hill,(1.-ice)*.5)*ao,land);

  float citySh=.65+.7*fbmQ(d*48.+2.2+uSeed);
  float denseCity=smoothstep(.50,.70,fbmQ(d*8.+9.2+uSeed))*smoothstep(.52,.78,vnoise(d*150.+uSeed))*land*(1.-ice)*(uSurfType<0.5?1.:0.2)*citySh*uCities;
  float suburbs=smoothstep(.45,.65,fbmQ(d*10.+9.2+uSeed))*smoothstep(.45,.70,vnoise(d*70.+uSeed))*land*(1.-ice)*(uSurfType<0.5?1.:0.2)*uCities;

  vec3 V=normalize(uCam-vWP);vec3 H=normalize(sun+nn);
  float fres=pow(1.-max(dot(nn,V),0.),5.);
  float waterM=(1.-land)*(1.-ice)*uWater;
  float spec=pow(max(dot(nn,H),0.),240.)*waterM*(1.-night)*(.10+.90*fres)*1.4;
  float fillK=.004+.03*smoothstep(-1.0,.1,nd);
  float ambK=1.-.25*clamp(uDepth,0.,1.5);
  vec3 col=albedo*(vec3(fillK*.8,fillK,fillK*1.4)*ambK+diff*vec3(1.05,1.0,0.95));
  col=mix(col,col*vec3(1.15,.72,.45)+vec3(.10,.04,.015)*albedo,term*.55);
  col+=waterM*(vec3(.014,.048,.115)*(0.10+0.90*dayF)+fres*vec3(.06,.11,.19)*dayF);

  float lavaK=smoothstep(.15,.6,uLava);
  if(lavaK>.01){
    float ln=fbmQ(d*5.+uSeed+vec3(0.,uTime*.01,0.));
    float crack=1.-smoothstep(0.,.02,abs(ln-.5));
    crack*=smoothstep(.40,.70,fbmQ(d*3.+7.7+uSeed));
    float scorch=1.-smoothstep(0.,.12,abs(ln-.5));
    col=mix(col,vec3(.05,.03,.025),scorch*lavaK*.6);
    vec3 lav=mix(vec3(.45,.05,0.),vec3(1.,.5,.1),crack);
    col+=lav*crack*lavaK*(.12+1.0*night+.04*diff);
  }

  float t1=uTime*.006;vec3 dc=rotY(d,uDriftLow);
  float cs=max(max(
    smoothstep(.44,.66,fbmQ(dc*9.0+vec3(t1,.3*t1,-t1)+uSeed))*smoothstep(.28,.52,fbmQ(dc*22.0-t1+uSeed))*.95,
    smoothstep(.40,.62,fbmQ(dc*3.1+vec3(-t1*.7,0.,t1*.5)+uSeed))*.8),
    smoothstep(.52,.72,fbmQ(dc*4.6+t1*.4+uSeed)));
  col*=1.-.42*cs*diff;
  col+=vec3(1.)*spec;
  float specAll=pow(max(dot(nn,H),0.),48.)*uSpecInt*dayF;
  col+=vec3(1.,.98,.95)*specAll;
  col+=uAtmoCol*fres*waterM*dayF*.22;
  col+=uCityCol*vec3(1.,.95,.8)*suburbs*.8*night+uCityCol*denseCity*citySh*2.2*night;

  float hSun=terrainH(normalize(d+sun*.08));
  float selfSh=smoothstep(-.03,.06,h-hSun+.02);
  col*=.72+.28*selfSh;

  float cT0=.70-.32*uCloud;
  float cSh=smoothstep(cT0,cT0+.22,fbmQ(dc*9.0+vec3(t1,.3*t1,-t1)+uSeed))*smoothstep(cT0-.18,cT0+.05,fbmQ(dc*22.0-t1+uSeed));
  col*=1.-cSh*.30*dayF;

  float viewMu=clamp(dot(n,V),0.,1.);
  float limbHaze=pow(1.-viewMu,2.2);
  col=mix(col,uAtmoCol*.85,limbHaze*(.45*dayF+.03));

  gl_FragColor=vec4(tonemap(col),1.);}`;

export interface PlanetSurfaceParams {
    variant: string;
    generated: GeneratedPlanet;
}

/** Строит параметры поверхности из сгенерированной планеты. */
export function buildSurfaceMaterial(planet: Planet): THREE.ShaderMaterial {
    const gen = planetGenerator.generate(planet.variant ?? 'earth_like', planet.seed);
    return createSurfaceMaterial(gen);
}

/** Создаёт материал поверхности из уже сгенерированных данных. */
export function createSurfaceMaterial(gen: GeneratedPlanet): THREE.ShaderMaterial {
    const p = gen.physics;
    const earthLike = LOOK.earth_like!;
    const look = LOOK[gen.meta.typeId] ?? earthLike;
    const cfg = look.cfg;
    const col = look.col;
    const noAtmo = p.atmospherePressureAtm < 0.05;
    const atmoInt = noAtmo ? 0 : Math.min(0.65, Math.pow(p.atmospherePressureAtm / 3, 0.8) * (1 - p.craters * 0.3));

    const vec3 = (a: readonly [number, number, number]): THREE.Vector3 => new THREE.Vector3(a[0], a[1], a[2]);
    const hex = (h: string): THREE.Color => new THREE.Color(h);
    const pal = (key: keyof typeof earthLike.col): readonly [number, number, number] => col[key] ?? DEFAULT_PALETTE[key] ?? [0, 0, 0];

    return new THREE.ShaderMaterial({
        vertexShader: VS_NANITE,
        fragmentShader: SURFACE_FRAG,
        uniforms: {
            uTime: { value: 0 },
            uSeed: { value: new THREE.Vector3(gen.physics.seedOffset[0], gen.physics.seedOffset[1], gen.physics.seedOffset[2]) },
            uSunDir: { value: new THREE.Vector3(1, 0.3, 0.5).normalize() },
            uCam: { value: new THREE.Vector3() },
            uDepth: { value: 0.15 },
            uPost: { value: 1 },
            uQ: { value: 2 },
            uDriftLow: { value: 0 },
            uSea: { value: cfg.sea ?? 0.47 },
            uWater: { value: cfg.water ?? (p.ocean > 0.2 ? 1 : p.ocean / 0.2) },
            uIceCaps: { value: (cfg.iceCaps ?? 0) },
            uBump: { value: cfg.bump ?? 0.8 },
            uCities: { value: noAtmo ? 0 : (cfg.cities ?? 0) * (Math.random() > 0.3 ? 1 : 0) },
            uLava: { value: (p.lava + p.fire * 0.5) > 0.55 ? (p.lava + p.fire * 0.5 - 0.55) * 2.2 : 0 },
            uSpecInt: { value: 0.15 + Math.random() * 0.45 },
            uSurfType: { value: surfTypeToFloat(gen.surface.type) },
            uSurfRough: { value: gen.surface.roughness },
            uSurfGloss: { value: gen.surface.gloss },
            uSurfDetail: { value: gen.surface.detail },
            uRidgeAmount: { value: gen.surface.ridgeAmount },
            uCrackDensity: { value: gen.surface.crackDensity },
            uCraterScale: { value: gen.surface.craterScale },
            uCraterDensity: { value: p.craters },
            uAnomalyType: { value: anomalyToFloat(gen.anomaly.type) },
            uAnomalyPos: {
                value: new THREE.Vector3(
                    Math.cos(gen.anomaly.lat) * Math.cos(gen.anomaly.lon),
                    Math.sin(gen.anomaly.lat),
                    Math.cos(gen.anomaly.lat) * Math.sin(gen.anomaly.lon),
                ),
            },
            uAnomalySize: { value: gen.anomaly.size },
            uAnomalyIntensity: { value: gen.anomaly.intensity },
            uCloud: { value: noAtmo ? gen.clouds.density * 0.08 : gen.clouds.density },
            uOcDeep: { value: vec3(pal('ocDeep')) },
            uOcShelf: { value: vec3(pal('ocShelf')) },
            uOcTurq: { value: vec3(pal('ocTurq')) },
            uOcShore: { value: vec3(pal('ocShore')) },
            uLandDry: { value: vec3(pal('landDry')) },
            uLandLow: { value: vec3(pal('landLow')) },
            uLandHigh: { value: vec3(pal('landHigh')) },
            uRock: { value: vec3(pal('rock')) },
            uSnow: { value: vec3(pal('snow')) },
            uCityCol: { value: hex('#d9a85a') },
            uAtmoCol: { value: vec3(pal('atmo')) },
        },
    });
}

/** Обратная совместимость: старый фасад. planet.variant используется для графики. */
export function createPlanetSurfaceMaterial(planet: Planet, _rng: () => number): THREE.ShaderMaterial {
    return buildSurfaceMaterial(planet);
}

function surfTypeToFloat(t: string): number {
    const order = ['rocky', 'lava', 'ice', 'sand', 'metal', 'bio', 'cratered', 'ridged', 'cracked', 'maria'];
    return Math.max(0, order.indexOf(t));
}

function anomalyToFloat(t: string): number {
    const order = ['none', 'giant_crater', 'rift_zone', 'hotspot', 'dark_basin'];
    return Math.max(0, order.indexOf(t));
}
