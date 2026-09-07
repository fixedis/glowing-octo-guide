// client/src/scene/chunk-math.ts

export const CHUNK_SIZE = 1000;

export interface ChunkCoord {
    readonly cx: number;
    readonly cy: number;
    readonly cz: number;
}

export function worldToChunk(x: number, y: number, z: number): ChunkCoord {
    return {
        cx: Math.floor(x / CHUNK_SIZE),
        cy: Math.floor(y / CHUNK_SIZE),
        cz: Math.floor(z / CHUNK_SIZE),
    };
}

export function chunkKey(c: ChunkCoord): string {
    return `${c.cx}|${c.cy}|${c.cz}`;
}

/**
 * Все ключи чанков в кубе радиуса r вокруг центра (включая границы).
 */
export function activeChunkKeys(center: ChunkCoord, radius: number): string[] {
    const keys: string[] = [];
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dz = -radius; dz <= radius; dz++) {
                keys.push(chunkKey({
                    cx: center.cx + dx,
                    cy: center.cy + dy,
                    cz: center.cz + dz,
                }));
            }
        }
    }
    return keys;
}

/**
 * Чебышевское расстояние между двумя чанками (в чанках, не в метрах).
 */
export function chunkDistance(a: ChunkCoord, b: ChunkCoord): number {
    return Math.max(
        Math.abs(a.cx - b.cx),
        Math.abs(a.cy - b.cy),
        Math.abs(a.cz - b.cz),
    );
}

/**
 * Какие из keys надо выгрузить: те, что дальше чем maxDistance от центра.
 */
export function keysToUnload(
    keys: Iterable<string>,
    center: ChunkCoord,
    maxDistance: number,
): string[] {
    const out: string[] = [];
    for (const key of keys) {
        const [sx, sy, sz] = key.split('|');
        if (sx === undefined || sy === undefined || sz === undefined) {
            continue;
        }
        const c: ChunkCoord = {
            cx: Number(sx),
            cy: Number(sy),
            cz: Number(sz),
        };
        if (chunkDistance(c, center) > maxDistance) {
            out.push(key);
        }
    }
    return out;
}
