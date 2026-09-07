// client/src/core/types.ts

export type GalaxyType = 'spiral' | 'elliptical' | 'irregular';

export interface Galaxy {
    readonly seed: number;
    readonly name: string;
    readonly type: GalaxyType;
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly radius: number;
}

export type SpectralType = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';

export interface StarSystem {
    readonly seed: number;
    readonly name: string;
    readonly spectralType: SpectralType;
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly planetCount: number;
}

export interface RoutePoint {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

export interface Route {
    readonly from: number;
    readonly to: number;
    readonly points: readonly RoutePoint[];
}

export type PlanetType = 'terran' | 'ice' | 'lava' | 'gas' | 'moon';

export interface Planet {
    readonly seed: number;
    readonly index: number;
    readonly type: PlanetType;
    /** Расширенный визуальный вариант (из PHP PlanetGenerator), напр. 'earth_like', 'gas_giant'. */
    readonly variant: string;
    readonly radiusKm: number;
    readonly semiMajorAxisAuMilli: number;
    readonly eccentricityFixed: number;
    readonly inclinationFixed: number;
}

export type BuildingType =
    | 'dome'
    | 'extractor'
    | 'power'
    | 'turret'
    | 'tower'
    | 'landing_pad';

export interface Building {
    readonly seed: number;
    readonly planetSeed: number;
    readonly face: number;
    readonly x: number;
    readonly y: number;
    readonly depth: number;
    readonly type: BuildingType;
}

export interface CommandMeta {
    readonly command: string;
    readonly tick: number;
}

export interface ApiResponse<T> {
    readonly data: T;
    readonly meta: CommandMeta;
}
