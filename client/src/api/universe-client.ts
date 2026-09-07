// client/src/api/universe-client.ts

import { ApiClient } from './client.js';
import type {
    ApiResponse,
    Building,
    Galaxy,
    Planet,
    Route,
    StarSystem,
} from '../core/types.js';

export interface GalaxyChunkData {
    readonly universeSeed: number;
    readonly chunk: readonly [number, number, number];
    readonly galaxies: readonly Galaxy[];
}

export interface StarSystemsData {
    readonly galaxySeed: number;
    readonly systems: readonly StarSystem[];
    readonly routes: readonly Route[];
}

export interface PlanetsData {
    readonly systemSeed: number;
    readonly planets: readonly Planet[];
}

export interface ColonyAreaData {
    readonly planetSeed: number;
    readonly face: number;
    readonly depth: number;
    readonly x: number;
    readonly y: number;
    readonly size: number;
    readonly buildings: readonly Building[];
}

export interface BuildingData {
    readonly building: Building | null;
}

export interface DemolishData {
    readonly planetSeed: number;
    readonly face: number;
    readonly x: number;
    readonly y: number;
    readonly depth: number;
}

export class UniverseClient {
    public constructor(private readonly api: ApiClient) {}

    public getGalaxies(
        seed: number,
        chunk: [number, number, number],
    ): Promise<ApiResponse<GalaxyChunkData>> {
        return this.api.get<GalaxyChunkData>('/api/v1/universe/galaxies', {
            seed,
            cx: chunk[0],
            cy: chunk[1],
            cz: chunk[2],
        });
    }

    public getStarSystems(
        galaxySeed: number,
        radius?: number,
    ): Promise<ApiResponse<StarSystemsData>> {
        const query: Record<string, number> = {};
        if (radius !== undefined) {
            query.radius = radius;
        }
        return this.api.get<StarSystemsData>(
            `/api/v1/galaxies/${galaxySeed}/systems`,
            query,
        );
    }

    public getPlanets(
        systemSeed: number,
        count: number,
    ): Promise<ApiResponse<PlanetsData>> {
        return this.api.get<PlanetsData>(
            `/api/v1/systems/${systemSeed}/planets`,
            { count },
        );
    }

    /**
     * ФРАКТАЛ: галактика внутри звёздной системы. Тот же генератор, что
     * и для карты вселенной, но seed = systemSeed (детерминированно).
     */
    public getSystemGalaxies(
        universeSeed: number,
        systemSeed: number,
        chunk: [number, number, number],
    ): Promise<ApiResponse<GalaxyChunkData>> {
        return this.api.get<GalaxyChunkData>('/api/v1/universe/galaxies', {
            seed: systemSeed,
            cx: chunk[0],
            cy: chunk[1],
            cz: chunk[2],
            _universeSeed: universeSeed,
        });
    }

    public getColonyArea(params: {
        planetSeed: number;
        face: number;
        depth: number;
        x: number;
        y: number;
        size: number;
    }): Promise<ApiResponse<ColonyAreaData>> {
        return this.api.get<ColonyAreaData>(
            `/api/v1/planets/${params.planetSeed}/colony`,
            {
                face: params.face,
                depth: params.depth,
                x: params.x,
                y: params.y,
                size: params.size,
            },
        );
    }

    public placeBuilding(params: {
        planetSeed: number;
        face: number;
        depth: number;
        x: number;
        y: number;
        type: Building['type'];
    }): Promise<ApiResponse<BuildingData>> {
        return this.api.post<BuildingData>(
            `/api/v1/planets/${params.planetSeed}/colony/place`,
            {
                face: params.face,
                depth: params.depth,
                x: params.x,
                y: params.y,
                type: params.type,
            },
        );
    }

    public demolishBuilding(params: {
        planetSeed: number;
        face: number;
        depth: number;
        x: number;
        y: number;
    }): Promise<ApiResponse<DemolishData>> {
        return this.api.post<DemolishData>(
            `/api/v1/planets/${params.planetSeed}/colony/demolish`,
            {
                face: params.face,
                depth: params.depth,
                x: params.x,
                y: params.y,
            },
        );
    }
}
