// client/src/scene/k-nearest.ts

import type { Galaxy } from '../core/types.js';

export interface Edge {
    readonly from: number;
    readonly to: number;
}

/**
 * Строит граф соединений: каждая галактика соединяется с k ближайшими.
 * Дубли рёбер устраняются.
 */
export function buildKNearest(galaxies: readonly Galaxy[], k: number): Edge[] {
    const n = galaxies.length;
    if (n < 2 || k <= 0) {
        return [];
    }

    const seen = new Set<string>();
    const edges: Edge[] = [];

    const pushEdge = (a: number, b: number): void => {
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (seen.has(key)) return;
        seen.add(key);
        edges.push({ from: a, to: b });
    };

    for (let i = 0; i < n; i++) {
        const g = galaxies[i]!;
        const distances: Array<{ idx: number; d: number }> = [];
        for (let j = 0; j < n; j++) {
            if (i === j) continue;
            const o = galaxies[j]!;
            const dx = g.x - o.x;
            const dy = g.y - o.y;
            const dz = g.z - o.z;
            distances.push({ idx: j, d: dx * dx + dy * dy + dz * dz });
        }
        distances.sort((a, b) => a.d - b.d);
        const take = Math.min(k, distances.length);
        for (let m = 0; m < take; m++) {
            pushEdge(i, distances[m]!.idx);
        }
    }

    return edges;
}
