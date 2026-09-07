// client/tests/api/universe-client.test.ts

import { describe, expect, it } from 'vitest';
import { ApiClient, ApiError } from '../../src/api/client.js';
import { UniverseClient } from '../../src/api/universe-client.js';

interface MockCall {
    url: string;
    init?: RequestInit | undefined;
}

function mockFetch(responses: Map<string, Response>): {
    fetch: typeof fetch;
    calls: MockCall[];
} {
    const calls: MockCall[] = [];
    const fetchFn: typeof fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : (input as URL).href;
        calls.push({ url, init });
        const response = responses.get(url);
        if (!response) {
            throw new Error(`No mock response for ${url}`);
        }
        return response;
    };
    return { fetch: fetchFn, calls };
}

function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('ApiClient', () => {
    it('appends query params', async () => {
        const { fetch, calls } = mockFetch(new Map([
            ['http://host/api/v1/health?k=v',
                jsonResponse(200, { data: {}, meta: { command: 'health', tick: 0 } })],
        ]));
        const client = new ApiClient({ baseUrl: 'http://host', fetch });
        await client.get('/api/v1/health', { k: 'v' });
        expect(calls[0]!.url).toBe('http://host/api/v1/health?k=v');
    });

    it('sends JSON body on POST', async () => {
        const { fetch, calls } = mockFetch(new Map([
            ['http://host/api/v1/action',
                jsonResponse(200, { data: {}, meta: { command: 'action', tick: 0 } })],
        ]));
        const client = new ApiClient({ baseUrl: 'http://host', fetch });
        await client.post('/api/v1/action', { x: 1 });
        expect(calls[0]!.init?.method).toBe('POST');
        expect(JSON.parse(calls[0]!.init!.body as string)).toEqual({ x: 1 });
    });

    it('throws ApiError on non-2xx', async () => {
        const { fetch } = mockFetch(new Map([
            ['http://host/api/v1/bad', jsonResponse(422, { error: 'rejected' })],
        ]));
        const client = new ApiClient({ baseUrl: 'http://host', fetch });
        await expect(client.get('/api/v1/bad')).rejects.toMatchObject({
            status: 422,
            message: 'rejected',
        });
    });

    it('falls back to window origin when baseUrl is empty', async () => {
        const { fetch, calls } = mockFetch(new Map([
            ['http://localhost:3000/api/v1/health',
                jsonResponse(200, { data: {}, meta: { command: 'health', tick: 0 } })],
        ]));
        const client = new ApiClient({ baseUrl: '', fetch });
        await client.get('/api/v1/health');
        expect(calls[0]!.url).toBe('http://localhost:3000/api/v1/health');
    });
});

describe('UniverseClient', () => {
    it('getGalaxies builds correct URL', async () => {
        const { fetch, calls } = mockFetch(new Map([
            ['http://host/api/v1/universe/galaxies?seed=1337&cx=0&cy=0&cz=0',
                jsonResponse(200, {
                    data: { universeSeed: 1337, chunk: [0, 0, 0], galaxies: [] },
                    meta: { command: 'GenerateGalaxyChunk', tick: 0 },
                })],
        ]));
        const client = new UniverseClient(new ApiClient({ baseUrl: 'http://host', fetch }));
        const response = await client.getGalaxies(1337, [0, 0, 0]);
        expect(response.data.galaxies).toEqual([]);
        expect(calls).toHaveLength(1);
    });

    it('placeBuilding sends typed payload', async () => {
        const { fetch, calls } = mockFetch(new Map([
            ['http://host/api/v1/planets/42/colony/place',
                jsonResponse(200, {
                    data: { building: null },
                    meta: { command: 'PlaceBuilding', tick: 1 },
                })],
        ]));
        const client = new UniverseClient(new ApiClient({ baseUrl: 'http://host', fetch }));
        await client.placeBuilding({
            planetSeed: 42,
            face: 0,
            depth: 2,
            x: 1,
            y: 1,
            type: 'tower',
        });
        const body = JSON.parse(calls[0]!.init!.body as string);
        expect(body).toEqual({
            face: 0,
            depth: 2,
            x: 1,
            y: 1,
            type: 'tower',
        });
    });
});
