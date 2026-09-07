// client/src/core/seed-graph.ts

/**
 * Детерминированный seed-граф.
 * FNV-1a 32-bit + mulberry32 — идентичен PHP-реализации SeedGraph.
 */

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

function toInt32(value: number): number {
    value >>>= 0;
    if (value >= 0x80000000) {
        value -= 0x100000000;
    }
    return value;
}

function imul(a: number, b: number): number {
    a = toInt32(a);
    b = toInt32(b);
    const ah = (a >>> 16) & 0xffff;
    const al = a & 0xffff;
    const bh = (b >>> 16) & 0xffff;
    const bl = b & 0xffff;
    const high = (ah * bl + al * bh) & 0xffff;
    return toInt32((high << 16) + al * bl);
}

export class SeedGraph {
    public hash(path: string): number {
        let h = FNV_OFFSET;
        for (let i = 0; i < path.length; i++) {
            const ch = path.charCodeAt(i);
            h = (h ^ ch) >>> 0;
            h = imul(h, FNV_PRIME) >>> 0;
        }
        return h >>> 0;
    }

    public hashInts(...values: number[]): number {
        return this.hash(values.join('|'));
    }

    public rng(path: string): () => number {
        return SeedGraph.mulberry32(toInt32(this.hash(path)));
    }

    public static mulberry32(seed: number): () => number {
        let state = toInt32(seed);
        return (): number => {
            state = toInt32(state + 0x6d2b79f5);
            let t = imul(state ^ (state >>> 15), 1 | state);
            t = toInt32(t + imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
}
