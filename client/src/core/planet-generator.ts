// client/src/core/planet-generator.ts
// Детерминированный генератор параметров планеты (перенос из earth_3d.html).
// Сервер (PHP) отдаёт готовый `variant` — клиент строит графику по нему,
// НЕ пересчитывая variant (совпадение по seed у всех клиентов).
// Графику сервер не считает (контракт NaniteEngine сохранён).

export type CloudType = 'none' | 'patchy' | 'global' | 'bands' | 'vortex';
export type SurfaceType =
    | 'rocky' | 'lava' | 'ice' | 'sand' | 'metal'
    | 'bio' | 'cratered' | 'ridged' | 'cracked' | 'maria';
export type AnomalyType = 'none' | 'giant_crater' | 'rift_zone' | 'hotspot' | 'dark_basin';
export type Category =
    | 'Каменистые' | 'Газовые' | 'Водные' | 'Экзотические'
    | 'Редкие' | 'Безжизненные' | 'Спутники' | 'Звёзды'
    | 'Полный рандом' | 'Обитаемые (Stellaris)';

export interface PlanetTypeDef {
    readonly id: string;
    readonly name: string;
    readonly category: Category;
    readonly composition: string;
    readonly ranges: Readonly<Record<string, readonly [number, number]>>;
    readonly colors: Readonly<Record<string, string>>;
}

export interface CloudSettings {
    readonly type: CloudType;
    readonly density: number;
    readonly bands: number;
    readonly vortexIntensity: number;
    readonly rotation: number;
    readonly thickness: number;
    readonly hurricane: number;
    readonly vortexLat: number;
    readonly vortexLon: number;
    readonly vortexSize: number;
    readonly driftSpeed: number;
}

export interface RingSettings {
    readonly enabled: boolean;
    readonly innerRadius: number;
    readonly outerRadius: number;
    readonly density: number;
    readonly opacity: number;
    readonly tilt: number;
    readonly particleSize: number;
    readonly gapCount: number;
    readonly gapPositions: readonly [number, number, number];
    readonly colorVariation: number;
}

export interface SurfaceSettings {
    readonly type: SurfaceType;
    readonly roughness: number;
    readonly gloss: number;
    readonly detail: number;
    readonly ridgeAmount: number;
    readonly crackDensity: number;
    readonly craterScale: number;
}

export interface AnomalySettings {
    readonly type: AnomalyType;
    readonly lat: number;
    readonly lon: number;
    readonly size: number;
    readonly intensity: number;
}

export interface PhysicsParams {
    readonly massEarth: number;
    readonly radiusEarth: number;
    readonly density: number;
    readonly temperatureK: number;
    readonly atmospherePressureAtm: number;
    readonly magneticField: number;
    readonly volcanism: number;
    readonly tectonics: number;
    readonly ocean: number;
    readonly ice: number;
    readonly lava: number;
    readonly storm: number;
    readonly cities: number;
    readonly fire: number;
    readonly dust: number;
    readonly toxicity: number;
    readonly craters: number;
    readonly scale: number;
    readonly seedOffset: readonly [number, number, number];
    readonly habitability: number;
    gravityEarth: number;
    readonly resources: {
        readonly energy: number;
        readonly food: number;
        readonly minerals: number;
        readonly alloys: number;
    };
}

export interface GeneratedPlanet {
    readonly meta: {
        readonly generatorVersion: string;
        readonly seed: number;
        readonly typeId: string;
        readonly typeName: string;
        readonly category: Category;
        readonly composition: string;
    };
    readonly physics: PhysicsParams;
    readonly clouds: CloudSettings;
    readonly rings: RingSettings;
    readonly surface: SurfaceSettings;
    readonly anomaly: AnomalySettings;
    readonly palette: {
        readonly crust: string;
        readonly cloud: string;
        readonly storm: string;
        readonly ring: string;
    };
    readonly hueShift: number;
}

const CONFIG = Object.freeze({ generatorVersion: '5.1.0' });

const CLOUD_TYPES: readonly CloudType[] = ['none', 'patchy', 'global', 'bands', 'vortex'];
const SURFACE_TYPES: readonly SurfaceType[] = [
    'rocky', 'lava', 'ice', 'sand', 'metal', 'bio', 'cratered', 'ridged', 'cracked', 'maria',
];
const ANOMALY_TYPES: readonly AnomalyType[] = ['none', 'giant_crater', 'rift_zone', 'hotspot', 'dark_basin'];

function hexToRgb(hex: string): [number, number, number] {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m
        ? [parseInt(m[1] ?? '0', 16) / 255, parseInt(m[2] ?? '0', 16) / 255, parseInt(m[3] ?? '0', 16) / 255]
        : [0.5, 0.5, 0.5];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }
    return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h = ((h % 1) + 1) % 1;
    const hue2rgb = (p: number, q: number, t: number): number => {
        t = ((t % 1) + 1) % 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    if (s === 0) return [l, l, l];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}

function toHex(r: number, g: number, b: number): string {
    const c = (v: number): string => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
    return `#${c(r)}${c(g)}${c(b)}`;
}

function jitterHSL(hex: string, rng: () => number, hueAmt = 0.12, satAmt = 0.25, lightAmt = 0.2): string {
    const [r, g, b] = hexToRgb(hex);
    let [h, s, l] = rgbToHsl(r, g, b);
    h += (rng() * 2 - 1) * hueAmt;
    s = Math.min(1, Math.max(0, s + (rng() * 2 - 1) * satAmt));
    l = Math.min(0.95, Math.max(0.05, l + (rng() * 2 - 1) * lightAmt));
    const [nr, ng, nb] = hslToRgb(h, s, l);
    return toHex(nr, ng, nb);
}

const DEFAULT_RANGES: Readonly<Record<string, readonly [number, number]>> = Object.freeze({
    massEarth: [0.01, 10], radiusEarth: [0.1, 3], density: [2, 8], temperatureK: [50, 3000],
    atmospherePressureAtm: [0, 5], magneticField: [0, 1], volcanism: [0, 1], tectonics: [0, 1],
    ocean: [0, 1], ice: [0, 1], lava: [0, 1], storm: [0, 1], cities: [0, 0],
    clouds: [0, 1], crust: [0, 1], hurricane: [0, 1],
    scale: [0.3, 2.5], fire: [0, 1], dust: [0, 1], toxicity: [0, 1], craters: [0, 1],
    cloudType: [0, 4], cloudBands: [0, 20], cloudVortexIntensity: [0, 1], cloudRotation: [0, 0.1], cloudThickness: [0, 1],
    ringsEnabled: [0, 1], ringsInner: [1.3, 1.8], ringsOuter: [2.0, 3.5], ringsDensity: [0, 1],
    ringsOpacity: [0, 1], ringsTilt: [0, 30], ringsParticleSize: [0.01, 0.1],
    surfaceType: [0, 9], surfaceRoughness: [0, 1], surfaceGloss: [0, 1], surfaceDetail: [0, 1],
    anomalyType: [0, 4], habitability: [0, 100],
    resources_energy: [0, 10], resources_food: [0, 10], resources_minerals: [0, 10], resources_alloys: [0, 10],
});

const DEFAULT_COLORS: Readonly<Record<string, string>> = Object.freeze({
    crust: '#7a5c40', cloud: '#e8f4ff', storm: '#ffd166', ring: '#c8b8a0',
});

function T(
    id: string, name: string, category: Category, composition: string,
    ranges: Record<string, readonly [number, number]> = {},
    colors: Record<string, string> = {},
): PlanetTypeDef {
    return {
        id, name, category, composition,
        ranges: Object.assign({}, DEFAULT_RANGES, ranges),
        colors: Object.assign({}, DEFAULT_COLORS, colors),
    };
}

// Подмножество вариантов, соответствующее базовым типам PHP (VARIANTS_BY_TYPE).
// Звёзды намеренно исключены — в QwinProdact звёзды рисуются star-surface/star-corona.
export const PLANET_TYPES: readonly PlanetTypeDef[] = Object.freeze([
    T('earth_like', 'Землеподобная', 'Каменистые', 'N2/O2, силикатная кора',
        { massEarth: [0.7, 1.5], radiusEarth: [0.85, 1.2], temperatureK: [220, 320],
            atmospherePressureAtm: [0.6, 1.3], ocean: [0.35, 0.85], lava: [0, 0.1],
            clouds: [0.3, 0.8], cloudType: [1, 2], surfaceType: [0, 0], scale: [0.8, 1.3] },
        { crust: '#4f7f52', cloud: '#eaf6ff', ring: '#a89878' }),
    T('continental', 'Континентальный', 'Обитаемые (Stellaris)', 'Континенты и океаны',
        { temperatureK: [250, 300], atmospherePressureAtm: [0.8, 1.2], ocean: [0.4, 0.7],
            clouds: [0.4, 0.7], cities: [0.2, 0.5], habitability: [60, 80],
            resources_energy: [2, 4], resources_food: [4, 6], resources_minerals: [2, 4], resources_alloys: [1, 3] },
        { crust: '#4f7f52', cloud: '#eaf6ff', atmo: '#3485c8' }),
    T('tropical', 'Тропический', 'Обитаемые (Stellaris)', 'Влажные тропики',
        { temperatureK: [280, 320], atmospherePressureAtm: [0.9, 1.3], ocean: [0.5, 0.7],
            clouds: [0.5, 0.8], cities: [0.2, 0.4], habitability: [70, 90],
            resources_energy: [3, 5], resources_food: [6, 8], resources_minerals: [2, 4], resources_alloys: [1, 3] },
        { crust: '#3a8f4a', cloud: '#e8f8ff', atmo: '#5aa0c8' }),
    T('ocean', 'Океанический', 'Обитаемые (Stellaris)', 'Глобальный океан',
        { temperatureK: [260, 310], atmospherePressureAtm: [0.9, 1.3], ocean: [0.85, 0.98],
            clouds: [0.5, 0.8], cities: [0.1, 0.3], habitability: [65, 85],
            resources_energy: [3, 5], resources_food: [6, 9], resources_minerals: [1, 3], resources_alloys: [1, 3] },
        { crust: '#2f65b8', cloud: '#f0fbff', atmo: '#4a8fc8' }),
    T('swamp', 'Болотный', 'Обитаемые (Stellaris)', 'Влажные болота',
        { temperatureK: [270, 310], atmospherePressureAtm: [0.8, 1.2], ocean: [0.4, 0.6],
            clouds: [0.4, 0.7], cities: [0.1, 0.3], habitability: [50, 70],
            resources_energy: [2, 4], resources_food: [5, 7], resources_minerals: [2, 4], resources_alloys: [1, 3] },
        { crust: '#5a7a5a', cloud: '#a8c8a8', atmo: '#6a8a6a' }),
    T('savanna', 'Саванна', 'Обитаемые (Stellaris)', 'Засушливые равнины',
        { temperatureK: [270, 320], atmospherePressureAtm: [0.6, 1.0], ocean: [0.2, 0.4],
            clouds: [0.2, 0.4], cities: [0.1, 0.3], habitability: [55, 75],
            resources_energy: [4, 6], resources_food: [3, 5], resources_minerals: [3, 5], resources_alloys: [1, 3] },
        { crust: '#b89050', cloud: '#f0e0c0', atmo: '#d8b070' }),
    T('gaia_world', 'Мир Гайи', 'Обитаемые (Stellaris)', 'Идеальный мир',
        { temperatureK: [270, 290], atmospherePressureAtm: [0.9, 1.1], ocean: [0.5, 0.7],
            clouds: [0.4, 0.6], cities: [0.3, 0.5], habitability: [100, 100],
            resources_energy: [6, 6], resources_food: [6, 6], resources_minerals: [4, 4], resources_alloys: [2, 2] },
        { crust: '#4a8f5c', cloud: '#eaf6ff', atmo: '#3a85c8' }),
    T('arid', 'Аридный', 'Обитаемые (Stellaris)', 'Засушливый мир',
        { temperatureK: [280, 330], atmospherePressureAtm: [0.5, 0.9], ocean: [0.1, 0.3],
            clouds: [0.1, 0.3], cities: [0.1, 0.3], habitability: [50, 70],
            resources_energy: [4, 6], resources_food: [1, 3], resources_minerals: [3, 5], resources_alloys: [1, 3] },
        { crust: '#c77f45', cloud: '#f4e0c0', atmo: '#d4a060' }),
    T('desert', 'Пустынный', 'Обитаемые (Stellaris)', 'Экстремальная пустыня',
        { temperatureK: [300, 380], atmospherePressureAtm: [0.3, 0.7], ocean: [0, 0.15],
            clouds: [0, 0.2], cities: [0.05, 0.2], habitability: [40, 60],
            resources_energy: [5, 7], resources_food: [0, 2], resources_minerals: [4, 6], resources_alloys: [1, 3] },
        { crust: '#d89050', cloud: '#f8e8d0', atmo: '#e8b070' }),

    T('arctic', 'Арктический', 'Каменистые', 'Ледяной мир',
        { temperatureK: [180, 230], atmospherePressureAtm: [0.6, 1.0], ocean: [0.3, 0.6], ice: [0.6, 0.9],
            clouds: [0.3, 0.6], cities: [0.1, 0.3], habitability: [30, 50],
            resources_energy: [1, 3], resources_food: [2, 4], resources_minerals: [5, 7], resources_alloys: [1, 3] },
        { crust: '#aaccee', cloud: '#ddeeff', atmo: '#88aacc' }),
    T('tundra', 'Тундра', 'Каменистые', 'Вечная мерзлота',
        { temperatureK: [210, 260], atmospherePressureAtm: [0.6, 1.0], ocean: [0.3, 0.5], ice: [0.4, 0.7],
            clouds: [0.3, 0.5], cities: [0.1, 0.3], habitability: [40, 60],
            resources_energy: [2, 4], resources_food: [3, 5], resources_minerals: [4, 6], resources_alloys: [1, 3] },
        { crust: '#8aaa8a', cloud: '#c8d8c8', atmo: '#7a9a7a' }),
    T('snowball', 'Снежный мир', 'Водные', 'Сплошная ледяная оболочка',
        { temperatureK: [70, 220], ice: [0.7, 1], clouds: [0.2, 0.7], cloudType: [1, 2], surfaceType: [2, 9], scale: [0.6, 1.4] },
        { crust: '#f2fbff', cloud: '#ffffff' }),
    T('frozen_wasteland', 'Замёрзшая пустошь', 'Безжизненные', 'Холодная пустыня',
        { temperatureK: [50, 150], atmospherePressureAtm: [0.01, 0.3], ice: [0.5, 1],
            clouds: [0, 0.3], cloudType: [0, 2], surfaceType: [2, 9], scale: [0.5, 1.4] },
        { crust: '#aaccee', cloud: '#ddeeff' }),
    T('icy_moon', 'Ледяной спутник', 'Спутники', 'Замёрзший спутник',
        { massEarth: [0.01, 0.15], temperatureK: [50, 150], ocean: [0.1, 0.5], ice: [0.7, 1],
            clouds: [0, 0.05], cloudType: [0, 1], surfaceType: [2, 9], scale: [0.25, 0.55] },
        { crust: '#ddeeff' }),

    T('lava_planet', 'Лавовая планета', 'Экзотические', 'Расплавленная поверхность',
        { temperatureK: [900, 2200], volcanism: [0.7, 1], lava: [0.7, 1], fire: [0.6, 1],
            storm: [0.2, 0.7], clouds: [0.2, 0.6], cloudType: [1, 2], surfaceType: [1, 1], scale: [0.6, 2], anomalyType: [2, 3] },
        { crust: '#241108', cloud: '#ffcf9f' }),
    T('fire_planet', 'Огненная планета', 'Экзотические', 'Горящая поверхность',
        { temperatureK: [800, 2500], volcanism: [0.5, 1], lava: [0.6, 1], fire: [0.8, 1],
            storm: [0.3, 0.8], clouds: [0.1, 0.5], cloudType: [1, 4], surfaceType: [1, 1], scale: [0.7, 2] },
        { crust: '#4d1a00', cloud: '#ffaa33', storm: '#ffff00' }),
    T('volcanic', 'Вулканический', 'Экзотические', 'Активная вулканическая деятельность',
        { temperatureK: [800, 1500], volcanism: [0.7, 1], lava: [0.7, 1], atmospherePressureAtm: [2, 5],
            clouds: [0.2, 0.5], habitability: [5, 15], resources_minerals: [7, 9], resources_alloys: [3, 5] },
        { crust: '#2a1a0a', cloud: '#ff7a3a', atmo: '#ff6622' }),
    T('volcanic_moon', 'Вулканический спутник', 'Спутники', 'Как Ио',
        { massEarth: [0.01, 0.12], temperatureK: [200, 800], volcanism: [0.6, 1], lava: [0.5, 1],
            clouds: [0, 0.15], cloudType: [0, 1], surfaceType: [1, 1], scale: [0.25, 0.5], anomalyType: [2, 3] },
        { crust: '#553311', cloud: '#ffaa44' }),

    T('gas_giant', 'Газовый гигант', 'Газовые', 'H/He',
        { massEarth: [30, 400], radiusEarth: [4, 12], density: [0.4, 1.8], storm: [0.4, 0.9],
            clouds: [0.6, 1], cloudType: [3, 3], cloudBands: [8, 20], cloudVortexIntensity: [0.3, 0.8],
            surfaceType: [0, 0], hurricane: [0.2, 0.85], scale: [2, 3], ringsEnabled: [0.3, 0.7] },
        { crust: '#b4763d', cloud: '#f3e2c2', ring: '#d8c498' }),
    T('hot_jupiter', 'Горячий юпитер', 'Газовые', 'Раскалённый гигант',
        { massEarth: [50, 500], radiusEarth: [8, 15], temperatureK: [900, 2500], lava: [0.2, 0.7],
            storm: [0.7, 1], clouds: [0.5, 1], cloudType: [3, 4], cloudBands: [5, 15],
            cloudVortexIntensity: [0.5, 1], hurricane: [0.5, 1], scale: [2.2, 3.5] },
        { crust: '#4d1600', cloud: '#ffd8a8' }),
    T('cold_jupiter', 'Холодный юпитер', 'Газовые', 'Облака аммиака',
        { massEarth: [50, 400], temperatureK: [70, 160], ice: [0.2, 0.6], storm: [0.3, 0.8],
            clouds: [0.6, 1], cloudType: [3, 3], cloudBands: [10, 25], hurricane: [0.15, 0.7],
            scale: [1.8, 2.8], ringsEnabled: [0.2, 0.5] },
        { crust: '#6381a8', cloud: '#e8f4ff', ring: '#c8d8e8' }),
    T('ice_giant', 'Ледяной гигант', 'Газовые', 'Вода, метан, аммиак',
        { massEarth: [8, 60], radiusEarth: [2.5, 5], ice: [0.5, 0.9], storm: [0.5, 0.9],
            clouds: [0.5, 0.9], cloudType: [3, 3], cloudBands: [6, 18], hurricane: [0.3, 0.85],
            scale: [1.5, 2.2], ringsEnabled: [0.4, 0.8] },
        { crust: '#2b6f8a', cloud: '#d8fbff', ring: '#a8d8e0' }),
    T('saturn_like', 'Сатурноподобная', 'Газовые', 'Гигант с кольцами',
        { massEarth: [50, 300], radiusEarth: [5, 12], storm: [0.3, 0.7], clouds: [0.6, 1], cloudType: [3, 3],
            cloudBands: [12, 30], hurricane: [0.2, 0.6], scale: [2, 3], ringsEnabled: [1, 1],
            ringsInner: [1.3, 1.8], ringsOuter: [2.5, 4.5], ringsDensity: [0.6, 1], ringsOpacity: [0.7, 1] },
        { crust: '#c8a878', cloud: '#f8e8c8', ring: '#e8d8b8' }),

    T('moon', 'Луна', 'Спутники', 'Спутник без атмосферы',
        { massEarth: [0.01, 0.1], radiusEarth: [0.2, 0.5], atmospherePressureAtm: [0, 0.001],
            ocean: [0, 0], clouds: [0, 0], cloudType: [0, 0], craters: [0.8, 1], surfaceType: [6, 6], scale: [0.2, 0.5], anomalyType: [0, 2] },
        { crust: '#aaaaaa' }),
    T('barren_rock', 'Голая скала', 'Безжизненные', 'Каменная пустыня',
        { massEarth: [0.1, 3], atmospherePressureAtm: [0, 0.05], ocean: [0, 0], clouds: [0, 0.05],
            cloudType: [0, 1], craters: [0.3, 0.8], surfaceType: [6, 9], scale: [0.4, 1.3] },
        { crust: '#554433' }),
    T('mercury_like', 'Меркуриеподобная', 'Безжизненные', 'Безатмосферная',
        { massEarth: [0.05, 0.5], radiusEarth: [0.3, 0.7], temperatureK: [100, 700],
            atmospherePressureAtm: [0, 0.01], ocean: [0, 0], clouds: [0, 0], cloudType: [0, 0],
            craters: [0.7, 1], surfaceType: [6, 6], scale: [0.4, 0.8], anomalyType: [0, 2] },
        { crust: '#554433' }),
    T('titan_like', 'Титаноподобный', 'Спутники', 'Плотная атмосфера, углеводороды',
        { massEarth: [0.01, 0.15], atmospherePressureAtm: [1, 2], ocean: [0.2, 0.5],
            clouds: [0.5, 0.9], cloudType: [2, 3], surfaceType: [3, 3], scale: [0.3, 0.6] },
        { crust: '#aa8855', cloud: '#eecc88' }),
]);

const LOOK: Readonly<Record<string, {
    cfg: Record<string, number>;
    col: Record<string, [number, number, number]>;
}>> = Object.freeze({
    earth_like: {
        cfg: { sea: 0.47, water: 1, iceCaps: 0.5, cloud: 0.6, cloudType: 1, atmoInt: 0.5, craters: 0, lava: 0, cities: 1, bump: 0.8 },
        col: {
            ocDeep: [0.015, 0.07, 0.19], ocShelf: [0.03, 0.15, 0.30], ocTurq: [0.05, 0.27, 0.35], ocShore: [0.16, 0.38, 0.42],
            landDry: [0.44, 0.37, 0.25], landLow: [0.19, 0.29, 0.14], landHigh: [0.34, 0.29, 0.19], rock: [0.29, 0.26, 0.23], snow: [0.85, 0.88, 0.92],
            cloud: [0.90, 0.92, 0.95], cloud2: [0.78, 0.82, 0.88], atmo: [0.34, 0.54, 0.85],
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
    lava_planet: {
        cfg: { sea: 0.4, water: 0, iceCaps: 0, cloud: 0.15, cloudType: 0, atmoInt: 0.25, craters: 0, lava: 1, cities: 0, bump: 1, surfaceType: 1 },
        col: {
            landDry: [0.12, 0.09, 0.08], landLow: [0.09, 0.07, 0.06], landHigh: [0.15, 0.10, 0.08], rock: [0.07, 0.05, 0.05], snow: [0.30, 0.20, 0.15],
            ocDeep: [0.08, 0.05, 0.04], ocShelf: [0.10, 0.06, 0.05], ocTurq: [0.12, 0.07, 0.05], ocShore: [0.14, 0.08, 0.06],
            cloud: [0.35, 0.28, 0.24], cloud2: [0.30, 0.22, 0.18], atmo: [0.55, 0.25, 0.12],
        },
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
    cold_jupiter: {
        cfg: { sea: 0.5, water: 0, iceCaps: 0, cloud: 0.9, cloudType: 3, cloudBands: 14, cloudVortex: 0.4, atmoInt: 0.3, craters: 0, lava: 0, cities: 0, bump: 0.3, opaqueClouds: 1 },
        col: {
            cloud: [0.88, 0.91, 0.95], cloud2: [0.58, 0.68, 0.82], landDry: [0.72, 0.76, 0.82], landLow: [0.62, 0.67, 0.75], landHigh: [0.52, 0.58, 0.68],
            rock: [0.42, 0.48, 0.58], snow: [0.90, 0.93, 0.96], ocDeep: [0.45, 0.52, 0.62], ocShelf: [0.50, 0.57, 0.67], ocTurq: [0.55, 0.62, 0.72], ocShore: [0.60, 0.67, 0.77], atmo: [0.60, 0.70, 0.85],
        },
    },
    ice_giant: {
        cfg: { sea: 0.5, water: 0, iceCaps: 0, cloud: 0.8, cloudType: 3, cloudBands: 8, cloudVortex: 0.6, atmoInt: 0.35, craters: 0, lava: 0, cities: 0, bump: 0.3, opaqueClouds: 1 },
        col: {
            cloud: [0.55, 0.75, 0.85], cloud2: [0.35, 0.55, 0.70], landDry: [0.45, 0.60, 0.70], landLow: [0.35, 0.50, 0.62], landHigh: [0.27, 0.42, 0.54],
            rock: [0.20, 0.32, 0.42], snow: [0.75, 0.83, 0.90], ocDeep: [0.25, 0.40, 0.52], ocShelf: [0.30, 0.45, 0.57], ocTurq: [0.35, 0.50, 0.62], ocShore: [0.40, 0.55, 0.67], atmo: [0.40, 0.60, 0.75],
        },
    },
    hot_jupiter: {
        cfg: { sea: 0.5, water: 0, iceCaps: 0, cloud: 0.85, cloudType: 3, cloudBands: 8, cloudVortex: 0.8, atmoInt: 0.4, craters: 0, lava: 0.3, cities: 0, bump: 0.3, opaqueClouds: 1 },
        col: {
            cloud: [0.85, 0.60, 0.40], cloud2: [0.60, 0.35, 0.25], landDry: [0.70, 0.45, 0.30], landLow: [0.60, 0.36, 0.24], landHigh: [0.50, 0.28, 0.18],
            rock: [0.40, 0.20, 0.13], snow: [0.85, 0.70, 0.55], ocDeep: [0.45, 0.25, 0.15], ocShelf: [0.50, 0.30, 0.18], ocTurq: [0.55, 0.35, 0.21], ocShore: [0.60, 0.40, 0.24], atmo: [0.80, 0.45, 0.30],
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
    fire_planet: {
        cfg: { sea: 0.4, water: 0, iceCaps: 0, cloud: 0.1, cloudType: 0, atmoInt: 0.3, craters: 0, lava: 1, cities: 0, bump: 1.1, surfaceType: 1 },
        col: {
            landDry: [0.10, 0.07, 0.06], landLow: [0.08, 0.05, 0.05], landHigh: [0.13, 0.08, 0.07], rock: [0.06, 0.04, 0.04], snow: [0.28, 0.18, 0.12],
            ocDeep: [0.07, 0.04, 0.03], ocShelf: [0.09, 0.05, 0.04], ocTurq: [0.11, 0.06, 0.04], ocShore: [0.13, 0.07, 0.05],
            cloud: [0.32, 0.24, 0.20], cloud2: [0.27, 0.20, 0.16], atmo: [0.60, 0.28, 0.12],
        },
    },
    volcanic: {
        cfg: { sea: 0.4, water: 0, iceCaps: 0, cloud: 0.3, cloudType: 0, atmoInt: 0.5, craters: 0, lava: 1, cities: 0, bump: 1.0, surfaceType: 1 },
        col: {
            landDry: [0.18, 0.10, 0.06], landLow: [0.14, 0.08, 0.05], landHigh: [0.20, 0.12, 0.08], rock: [0.12, 0.07, 0.05], snow: [0.40, 0.30, 0.20],
            ocDeep: [0.10, 0.06, 0.04], ocShelf: [0.12, 0.07, 0.05], ocTurq: [0.14, 0.08, 0.05], ocShore: [0.16, 0.09, 0.06],
            cloud: [0.40, 0.30, 0.24], cloud2: [0.34, 0.24, 0.18], atmo: [0.70, 0.35, 0.15],
        },
    },
});

/** Детерминированный xorshift-RNG (совместим с прототипом). */
function makeRng(seed: number): () => number {
    let a = seed >>> 0;
    return (): number => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function pickRange(rng: () => number, range: readonly [number, number] | undefined): number {
    if (Array.isArray(range) && range.length === 2) return range[0] + rng() * (range[1] - range[0]);
    return 0;
}

function pickInt(rng: () => number, range: readonly [number, number] | undefined): number {
    return Math.floor(pickRange(rng, range));
}

/** Безопасный доступ к цвету варианта (noUncheckedIndexedAccess). */
function color(def: PlanetTypeDef, key: string, fallback: string): string {
    const v = def.colors[key];
    return v ?? fallback;
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export class PlanetGenerator {
    private readonly typesById = new Map<string, PlanetTypeDef>();

    public constructor(types: readonly PlanetTypeDef[] = PLANET_TYPES) {
        for (const t of types) this.typesById.set(t.id, t);
    }

    public findType(id: string): PlanetTypeDef | undefined {
        return this.typesById.get(id);
    }

    /** Возвращает описание варианта (диапазоны/цвета) либо fallback earth_like. */
    public getTypeOrFallback(id: string): PlanetTypeDef {
        return this.typesById.get(id) ?? this.typesById.get('earth_like')!;
    }

    public generate(variant: string, seed: number): GeneratedPlanet {
        const resolvedSeed = seed >>> 0;
        const rng = makeRng(resolvedSeed);
        const def = this.getTypeOrFallback(variant);

        const p: PhysicsParams = {
            massEarth: pickRange(rng, def.ranges.massEarth),
            radiusEarth: pickRange(rng, def.ranges.radiusEarth),
            density: pickRange(rng, def.ranges.density),
            temperatureK: pickRange(rng, def.ranges.temperatureK),
            atmospherePressureAtm: pickRange(rng, def.ranges.atmospherePressureAtm),
            magneticField: clamp01(pickRange(rng, def.ranges.magneticField)),
            volcanism: clamp01(pickRange(rng, def.ranges.volcanism)),
            tectonics: clamp01(pickRange(rng, def.ranges.tectonics)),
            ocean: clamp01(pickRange(rng, def.ranges.ocean)),
            ice: clamp01(pickRange(rng, def.ranges.ice)),
            lava: clamp01(pickRange(rng, def.ranges.lava)),
            storm: clamp01(pickRange(rng, def.ranges.storm)),
            cities: clamp01(pickRange(rng, def.ranges.cities)),
            fire: clamp01(pickRange(rng, def.ranges.fire ?? [0, 0])),
            dust: clamp01(pickRange(rng, def.ranges.dust ?? [0, 0])),
            toxicity: clamp01(pickRange(rng, def.ranges.toxicity ?? [0, 0])),
            craters: clamp01(pickRange(rng, def.ranges.craters ?? [0, 0])),
            scale: pickRange(rng, def.ranges.scale ?? [0.5, 1.5]),
            seedOffset: [rng() * 200 - 100, rng() * 200 - 100, rng() * 200 - 100],
            habitability: pickRange(rng, def.ranges.habitability ?? [0, 100]),
            gravityEarth: 0,
            resources: {
                energy: pickRange(rng, def.ranges.resources_energy ?? [0, 10]),
                food: pickRange(rng, def.ranges.resources_food ?? [0, 10]),
                minerals: pickRange(rng, def.ranges.resources_minerals ?? [0, 10]),
                alloys: pickRange(rng, def.ranges.resources_alloys ?? [0, 10]),
            },
        };
        p.gravityEarth = p.radiusEarth > 0 ? p.massEarth / (p.radiusEarth * p.radiusEarth) : 0;

        const cloudTypeIdx = pickInt(rng, def.ranges.cloudType ?? [0, 4]);
        const clouds: CloudSettings = {
            type: CLOUD_TYPES[cloudTypeIdx] ?? 'none',
            density: clamp01(pickRange(rng, def.ranges.clouds)),
            bands: pickInt(rng, def.ranges.cloudBands ?? [0, 20]),
            vortexIntensity: clamp01(pickRange(rng, def.ranges.cloudVortexIntensity ?? [0, 0])),
            rotation: pickRange(rng, def.ranges.cloudRotation ?? [0, 0.05]),
            thickness: clamp01(pickRange(rng, def.ranges.cloudThickness ?? [0.3, 0.8])),
            hurricane: clamp01(pickRange(rng, def.ranges.hurricane)),
            vortexLat: (rng() * 2 - 1) * 0.6,
            vortexLon: rng() * Math.PI * 2,
            vortexSize: 0.15 + rng() * 0.25,
            driftSpeed: 0.02 + rng() * 0.08,
        };

        const ringsEnabled = pickRange(rng, def.ranges.ringsEnabled ?? [0, 0]) > 0.5;
        const rings: RingSettings = {
            enabled: ringsEnabled,
            innerRadius: pickRange(rng, def.ranges.ringsInner ?? [1.3, 1.8]),
            outerRadius: pickRange(rng, def.ranges.ringsOuter ?? [2.0, 3.5]),
            density: clamp01(pickRange(rng, def.ranges.ringsDensity ?? [0, 0])),
            opacity: clamp01(pickRange(rng, def.ranges.ringsOpacity ?? [0, 0])),
            tilt: pickRange(rng, def.ranges.ringsTilt ?? [0, 15]),
            particleSize: pickRange(rng, def.ranges.ringsParticleSize ?? [0.02, 0.05]),
            gapCount: pickInt(rng, [0, 3]),
            gapPositions: [rng(), rng(), rng()],
            colorVariation: rng() * 0.4 - 0.2,
        };

        const surfaceTypeIdx = pickInt(rng, def.ranges.surfaceType ?? [0, 9]);
        const surface: SurfaceSettings = {
            type: SURFACE_TYPES[surfaceTypeIdx] ?? 'rocky',
            roughness: clamp01(pickRange(rng, def.ranges.surfaceRoughness ?? [0.3, 0.8])),
            gloss: clamp01(pickRange(rng, def.ranges.surfaceGloss ?? [0.1, 0.4])),
            detail: clamp01(pickRange(rng, def.ranges.surfaceDetail ?? [0.5, 1])),
            ridgeAmount: clamp01(pickRange(rng, [0, 1])),
            crackDensity: clamp01(pickRange(rng, [0, 1])),
            craterScale: 0.5 + rng() * 1.5,
        };

        const anomalyTypeIdx = pickInt(rng, def.ranges.anomalyType ?? [0, 4]);
        const anomaly: AnomalySettings = {
            type: ANOMALY_TYPES[anomalyTypeIdx] ?? 'none',
            lat: (rng() * 2 - 1) * 0.8,
            lon: rng() * Math.PI * 2,
            size: 0.1 + rng() * 0.3,
            intensity: 0.5 + rng() * 0.5,
        };

        const layersCrust = clamp01(pickRange(rng, def.ranges.crust));
        void layersCrust;

        const hueShift = (rng() * 2 - 1) * 0.15;

        return {
            meta: {
                generatorVersion: CONFIG.generatorVersion,
                seed: resolvedSeed,
                typeId: def.id,
                typeName: def.name,
                category: def.category,
                composition: def.composition,
            },
            physics: p,
            clouds,
            rings,
            surface,
            anomaly,
            palette: {
                crust: jitterHSL(color(def, 'crust', '#7a5c40'), rng, 0.15, 0.35, 0.25),
                cloud: jitterHSL(color(def, 'cloud', '#e8f4ff'), rng, 0.1, 0.2, 0.15),
                storm: jitterHSL(color(def, 'storm', '#ffd166'), rng, 0.15, 0.3, 0.2),
                ring: jitterHSL(color(def, 'ring', '#c8b8a0'), rng, 0.1, 0.2, 0.2),
            },
            hueShift,
        };
    }
}

export const planetGenerator = new PlanetGenerator();
