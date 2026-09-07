// client/src/core/locations.ts

import type { GalaxyType, PlanetType, SpectralType } from './types.js';

export interface UniverseLocation {
    readonly kind: 'universe';
    readonly seed: number;
}

export interface GalaxyLocation {
    readonly kind: 'galaxy';
    readonly seed: number;
    readonly name: string;
    readonly type: GalaxyType;
}

export interface SystemLocation {
    readonly kind: 'system';
    readonly seed: number;
    readonly name: string;
    readonly spectralType: SpectralType;
}

export interface PlanetLocation {
    readonly kind: 'planet';
    readonly seed: number;
    readonly index: number;
    readonly type: PlanetType;
}

export type Location =
    | UniverseLocation
    | GalaxyLocation
    | SystemLocation
    | PlanetLocation;

export type LocationKind = Location['kind'];

const NEXT_KIND: Record<LocationKind, LocationKind | null> = {
    universe: 'galaxy',
    galaxy: 'system',
    system: 'planet',
    planet: null,
};

export class LocationError extends Error {
    public constructor(message: string) {
        super(message);
        this.name = 'LocationError';
    }
}

/**
 * Иерархия текущего положения во вселенной.
 * Universe — всегда дно стека, его покинуть нельзя.
 */
export class LocationStack {
    private readonly stack: Location[];

    public constructor(universeSeed: number) {
        this.stack = [{ kind: 'universe', seed: universeSeed }];
    }

    public get current(): Location {
        return this.stack[this.stack.length - 1]!;
    }

    public get depth(): number {
        return this.stack.length;
    }

    public isAt(kind: LocationKind): boolean {
        return this.current.kind === kind;
    }

    public push(location: Location): void {
        const expected = NEXT_KIND[this.current.kind];

        if (expected === null) {
            throw new LocationError(
                `Cannot go deeper than ${this.current.kind}.`,
            );
        }

        if (location.kind !== expected) {
            throw new LocationError(
                `Cannot push ${location.kind} onto ${this.current.kind}; expected ${expected}.`,
            );
        }

        this.stack.push(location);
    }

    public pop(): Location {
        if (this.stack.length <= 1) {
            throw new LocationError('Cannot leave the universe.');
        }
        return this.stack.pop()!;
    }

    public popTo(kind: LocationKind): void {
        while (this.current.kind !== kind) {
            this.pop();
        }
    }

    /** Полный путь от вселенной до текущего уровня (копия стека). */
    public path(): readonly Location[] {
        return this.stack.slice();
    }

    public breadcrumb(): string {
        return this.stack.map((loc) => this.label(loc)).join(' > ');
    }

    public serialize(): string {
        return JSON.stringify(this.stack);
    }

    public static deserialize(json: string): LocationStack {
        let data: unknown;
        try {
            data = JSON.parse(json);
        } catch {
            throw new LocationError('Invalid location stack JSON.');
        }

        if (!Array.isArray(data) || data.length === 0) {
            throw new LocationError('Location stack must be a non-empty array.');
        }

        const first = data[0] as Location;
        if (first.kind !== 'universe' || typeof first.seed !== 'number') {
            throw new LocationError('Stack must start with a universe location.');
        }

        const stack = new LocationStack(first.seed);
        for (let i = 1; i < data.length; i++) {
            stack.push(data[i] as Location);
        }
        return stack;
    }

    private label(loc: Location): string {
        switch (loc.kind) {
            case 'universe':
                return `Universe #${loc.seed}`;
            case 'galaxy':
                return loc.name;
            case 'system':
                return loc.name;
            case 'planet':
                return `Planet ${loc.index + 1}`;
        }
    }
}
