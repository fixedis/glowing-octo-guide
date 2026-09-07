// client/tests/scene/chunk-math.test.ts

import { describe, expect, it } from 'vitest';
import {
    activeChunkKeys,
    chunkDistance,
    chunkKey,
    CHUNK_SIZE,
    keysToUnload,
    worldToChunk,
} from '../../src/scene/chunk-math.js';

describe('worldToChunk', () => {
    it('floors positive coords', () => {
        expect(worldToChunk(1500, 500, 2000)).toEqual({ cx: 1, cy: 0, cz: 2 });
    });

    it('floors negative coords', () => {
        expect(worldToChunk(-500, -1500, -100)).toEqual({ cx: -1, cy: -2, cz: -1 });
    });

    it('handles exact boundary', () => {
        expect(worldToChunk(CHUNK_SIZE, 0, 0)).toEqual({ cx: 1, cy: 0, cz: 0 });
        expect(worldToChunk(0, 0, 0)).toEqual({ cx: 0, cy: 0, cz: 0 });
    });
});

describe('activeChunkKeys', () => {
    it('returns 1 key for radius 0', () => {
        expect(activeChunkKeys({ cx: 0, cy: 0, cz: 0 }, 0)).toEqual(['0|0|0']);
    });

    it('returns 27 keys for radius 1', () => {
        expect(activeChunkKeys({ cx: 0, cy: 0, cz: 0 }, 1)).toHaveLength(27);
    });

    it('returns 125 keys for radius 2', () => {
        expect(activeChunkKeys({ cx: 0, cy: 0, cz: 0 }, 2)).toHaveLength(125);
    });
});

describe('chunkDistance', () => {
    it('returns 0 for same chunk', () => {
        expect(chunkDistance({ cx: 1, cy: 2, cz: 3 }, { cx: 1, cy: 2, cz: 3 })).toBe(0);
    });

    it('is Chebyshev distance', () => {
        expect(chunkDistance({ cx: 0, cy: 0, cz: 0 }, { cx: 2, cy: 1, cz: 3 })).toBe(3);
    });
});

describe('keysToUnload', () => {
    it('returns keys beyond maxDistance', () => {
        const keys = ['0|0|0', '5|0|0', '0|0|1'];
        const out = keysToUnload(keys, { cx: 0, cy: 0, cz: 0 }, 2);
        expect(out).toEqual(['5|0|0']);
    });

    it('keeps keys at exactly maxDistance', () => {
        const keys = ['2|0|0'];
        const out = keysToUnload(keys, { cx: 0, cy: 0, cz: 0 }, 2);
        expect(out).toEqual([]);
    });

    it('ignores malformed keys', () => {
        const keys = ['broken', '0|0|0'];
        const out = keysToUnload(keys, { cx: 0, cy: 0, cz: 0 }, 0);
        expect(out).toEqual([]);
    });
});
