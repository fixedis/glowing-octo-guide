// client/src/core/galaxy-shape.ts
import { SeedGraph } from './seed-graph.js';

/** Палитра хоррор-галактики MORTIS (порт palettes из прототипа galaxy-map-3d.html). */
export interface MortisPalette {
    readonly name: string;
    readonly youngA: string;
    readonly youngB: string;
    readonly oldA: string;
    readonly oldB: string;
    readonly hiiA: string;
    readonly hiiB: string;
    readonly emberA: string;
    readonly emberB: string;
    readonly vortexIn: string;
    readonly vortexOut: string;
    readonly core: readonly [string, string, string];
}

/** Пять палитр; выбор детерминирован seed-ом галактики. */
export const MORTIS_PALETTES: readonly MortisPalette[] = [
    {
        name: 'Пепел',
        youngA: '#7d90b0', youngB: '#dce6f2', oldA: '#8a6a50', oldB: '#c8a888',
        hiiA: '#5a0f0f', hiiB: '#a03020', emberA: '#5a6a80', emberB: '#7a2a1a',
        vortexIn: '#d8a878', vortexOut: '#7d90b0',
        core: ['#a06848', '#c05838', '#ff7040'],
    },
    {
        name: 'Кровь',
        youngA: '#a08090', youngB: '#e8dce2', oldA: '#7a4a40', oldB: '#c09080',
        hiiA: '#700a12', hiiB: '#c02030', emberA: '#705058', emberB: '#8a1a1a',
        vortexIn: '#e0906a', vortexOut: '#907080',
        core: ['#b06048', '#d04838', '#ff5040'],
    },
    {
        name: 'Токсин',
        youngA: '#7da098', youngB: '#dcf2ea', oldA: '#5a6a50', oldB: '#a8c0a0',
        hiiA: '#0f5a2a', hiiB: '#20a050', emberA: '#507a68', emberB: '#1a7a3a',
        vortexIn: '#a8d8b0', vortexOut: '#70a090',
        core: ['#68a080', '#38c070', '#70ff90'],
    },
    {
        name: 'Лёд',
        youngA: '#7090c0', youngB: '#e0f0ff', oldA: '#607080', oldB: '#a0b8c8',
        hiiA: '#0f2a5a', hiiB: '#2050a0', emberA: '#506a8a', emberB: '#1a3a7a',
        vortexIn: '#a8c8e0', vortexOut: '#7090b0',
        core: ['#6890b0', '#3878c0', '#70b0ff'],
    },
    {
        name: 'Формалин',
        youngA: '#9080a8', youngB: '#ece0f6', oldA: '#6a5a78', oldB: '#b0a0c0',
        hiiA: '#3a0f5a', hiiB: '#7020a0', emberA: '#6a5a80', emberB: '#4a1a7a',
        vortexIn: '#c8a8e0', vortexOut: '#9080a8',
        core: ['#9068b0', '#a038c0', '#d070ff'],
    },
];

/**
 * Детерминированная форма спиральной галактики MORTIS.
 *
 * Все параметры выводятся из seed через SeedGraph. ПОРЯДОК ПОТРЕБЛЕНИЯ rng
 * ИДЕНТИЧЕН PHP-классу Project\Engines\UniverseEngine\Core\GalaxyShape:
 * именно это гарантирует, что звёздные системы (генерация на PHP) лежат ровно
 * на тех же спиралях рукавов, что и частицы (визуал на TS). Ни одной
 * «оторванной» системы.
 */
export class GalaxyShape {
    private constructor(
        public readonly arms: number,
        public readonly twist: number,
        public readonly armWidthBase: number,
        public readonly armWidthGrow: number,
        public readonly meanderFast: number,
        public readonly meanderSlow: number,
        public readonly feather: number,
        public readonly spinSign: number,
        public readonly spinSpeed: number,
        public readonly vortexRadius: number,
        public readonly vortexDepth: number,
        public readonly vortexWind: number,
        public readonly vortexSpin: number,
        public readonly paletteIndex: number,
        public readonly twinkleAmp: number,
        public readonly embersDrift: number,
        public readonly embersSpeed: number,
        public readonly bgBand: number,
    ) {}

    /**
     * Выводит форму из seed. Число потреблений rng (18) и их порядок должны
     * совпадать с PHP-реализацией до последнего вызова.
     */
    public static create(seedGraph: SeedGraph, seed: number): GalaxyShape {
        const rng = seedGraph.rng('galaxy/' + seed + '/mortis');

        // 1..7 — геометрия рукавов (используется и на PHP).
        const arms = 1 + Math.floor(rng() * 5);
        const twist = 0.02 + rng() * 0.28;
        const armWidthBase = 0.4 + rng() * 3.6;
        const armWidthGrow = rng() * 0.85;
        const meanderFast = rng() * 4.0;
        const meanderSlow = rng() * 22.0;
        const feather = rng();
        // 8..13 — вращение и воронка.
        const spinSignDraw = rng() < 0.5 ? -1 : 1;
        const spinSpeedRaw = 0.005 + rng() * 0.075;
        const vortexRadius = 3.0 + rng() * 77.0;
        const vortexDepth = 0.1 + rng() * 14.9;
        const vortexWind = rng() * 0.6;
        const vortexSpinRaw = 0.005 + rng() * 0.075;
        // НАПРАВЛЕНИЕ ВРАЩЕНИЯ ИЗ ГЕОМЕТРИИ: твикл > 0 наматывает рукава
        // наружу ПРОТИВ часовой (на экране), поэтому материя должна течь
        // ПО часовой — тогда она движется вдоль рукава К ЦЕНТРУ («вкручивается»,
        // как водоворот). Прежний случайный знак давал половину галактик,
        // визуально «раскручивающихся».
        const spinSign = 1;
        const spinSpeed = spinSpeedRaw * spinSign;
        // Мини-воронка ядра — САМОСТОЯТЕЛЬНЫЙ знак (своя «монетка»): она
        // декоративно разнообразит картинку, вращаясь в любую сторону,
        // независимо от диска. НЕ наследует знак диска.
        const vortexSpin = vortexSpinRaw * spinSignDraw;
        // 14..18 — визуальные параметры (PHP потребляет «вхолостую»).
        const paletteIndex = Math.min(4, Math.floor(rng() * 5));
        const twinkleAmp = rng() * 0.12;
        const embersDrift = 0.2 + rng() * 1.3;
        const embersSpeed = 0.2 + rng() * 1.0;
        const bgBand = 0.2 + rng() * 0.5;

        return new GalaxyShape(
            arms, twist, armWidthBase, armWidthGrow, meanderFast, meanderSlow,
            feather, spinSign, spinSpeed, vortexRadius, vortexDepth, vortexWind,
            vortexSpin, paletteIndex, twinkleAmp, embersDrift, embersSpeed, bgBand,
        );
    }

    /** Меандр: поперечный изгиб осевой линии рукава (порт armCenterOff). */
    public armCenterOffset(r: number, arm: number): number {
        const m = Math.min(r / 16, 1);
        return (
            Math.sin(r * 0.09 + arm * 2.4) * this.meanderFast +
            Math.sin(r * 0.023 + arm * 0.7 + 1.3) * this.meanderSlow
        ) * m;
    }

    /** Ширина рукава на радиусе r (порт armWidth). */
    public armWidth(r: number, arm: number): number {
        const w = this.armWidthBase + r * this.armWidthGrow;
        const mod = 0.65 + 0.7 * (0.5 + 0.5 * Math.sin(r * 0.07 + arm * 1.7 + 0.4));
        return w * mod;
    }

    /** Полярный угол точки рукава при смещении lateral от осевой линии. */
    public armAngle(r: number, arm: number, lateral: number): number {
        return (arm / this.arms) * Math.PI * 2 + r * this.twist + lateral / Math.max(r, 1e-6);
    }

    /** Плоский снимок для кросс-теста с PHP-фикстурой. */
    public toJSON(): Record<string, number> {
        return {
            arms: this.arms,
            twist: this.twist,
            armWidthBase: this.armWidthBase,
            armWidthGrow: this.armWidthGrow,
            meanderFast: this.meanderFast,
            meanderSlow: this.meanderSlow,
            feather: this.feather,
            spinSign: this.spinSign,
            spinSpeed: this.spinSpeed,
            vortexRadius: this.vortexRadius,
            vortexDepth: this.vortexDepth,
            vortexWind: this.vortexWind,
            vortexSpin: this.vortexSpin,
            paletteIndex: this.paletteIndex,
            twinkleAmp: this.twinkleAmp,
            embersDrift: this.embersDrift,
            embersSpeed: this.embersSpeed,
            bgBand: this.bgBand,
        };
    }
}

/**
 * Параметры внутренней мини-спирали (воронки ядра) — ОТДЕЛЬНАЯ seed-ветка
 * `galaxy/<seed>/vortex`, основной поток rng GalaxyShape не трогает
 * (кросс-фикстура PHP↔TS остаётся валидной). Всё случайно, как у большой
 * галактики: число рукавов 1–4, длина витков, толщина, скорость, старт
 * от ядра. Направление вращения — СТРОГО в сторону закрутки спирали.
 */
export interface VortexShape {
    /** Число рукавов мини-спирали (1..4). */
    readonly arms: number;
    /** Дальность старта от ядра = радиус воронки (2..14 юнитов, ×R/60). */
    readonly radius: number;
    /** Закрутка: рад на юнит радиуса (0.9..2.6 — тугая спираль). */
    readonly twist: number;
    /** Толщина рукава (0.15..0.7 юнита, ×R/60). */
    readonly thickness: number;
    /** Скорость докручивания (рад/с, знак = сторона закрутки). */
    readonly spinSpeed: number;
}

export function createVortexShape(seedGraph: SeedGraph, seed: number): VortexShape {
    const rng = seedGraph.rng('galaxy/' + seed + '/vortex');
    // Диапазон как в оригинальном прототипе (3..80): часть галактик получает
    // огромную воронку на полдиска, часть — компактную. Плюс редкие гиганты.
    const radius = 6 + Math.pow(rng(), 1.4) * 74;
    const twist = 0.35 + rng() * 1.9;      // 0.35..2.25 — от плавных до тугих
    const thickness = 0.2 + rng() * 0.8;   // 0.2..1.0
    const arms = 1 + Math.floor(rng() * 4);
    // Вращение строго в сторону закрутки: спираль намотана CCW => +CCW.
    const spinSpeed = 0.15 + rng() * 0.65;
    return { arms, radius, twist, thickness, spinSpeed };
}
