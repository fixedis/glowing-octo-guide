// client/tests/core/locations.test.ts

import { describe, expect, it } from 'vitest';
import { LocationError, LocationStack } from '../../src/core/locations.js';
import type { GalaxyLocation, SystemLocation, PlanetLocation } from '../../src/core/locations.js';

const galaxy: GalaxyLocation = { kind: 'galaxy', seed: 1, name: 'NGC-1', type: 'spiral' };
const system: SystemLocation = { kind: 'system', seed: 2, name: 'SYS-1', spectralType: 'G' };
const planet: PlanetLocation = { kind: 'planet', seed: 3, index: 2, type: 'terran' };

describe('LocationStack', () => {
    it('starts at universe with given seed', () => {
        const stack = new LocationStack(1337);
        expect(stack.current).toEqual({ kind: 'universe', seed: 1337 });
        expect(stack.depth).toBe(1);
        expect(stack.isAt('universe')).toBe(true);
    });

    it('pushes galaxy onto universe', () => {
        const stack = new LocationStack(1);
        stack.push(galaxy);
        expect(stack.current).toEqual(galaxy);
        expect(stack.depth).toBe(2);
    });

    it('pushes system then planet in order', () => {
        const stack = new LocationStack(1);
        stack.push(galaxy);
        stack.push(system);
        stack.push(planet);
        expect(stack.depth).toBe(4);
        expect(stack.current).toEqual(planet);
    });

    it('rejects pushing system directly onto universe', () => {
        const stack = new LocationStack(1);
        expect(() => stack.push(system)).toThrow(LocationError);
    });

    it('rejects pushing galaxy onto system', () => {
        const stack = new LocationStack(1);
        stack.push(galaxy);
        stack.push(system);
        expect(() => stack.push(galaxy)).toThrow(LocationError);
    });

    it('pop returns last location and restores parent', () => {
        const stack = new LocationStack(1);
        stack.push(galaxy);
        const popped = stack.pop();
        expect(popped).toEqual(galaxy);
        expect(stack.current.kind).toBe('universe');
    });

    it('pop at universe throws', () => {
        const stack = new LocationStack(1);
        expect(() => stack.pop()).toThrow(LocationError);
    });

    it('popTo returns to universe from planet', () => {
        const stack = new LocationStack(1);
        stack.push(galaxy);
        stack.push(system);
        stack.push(planet);
        stack.popTo('universe');
        expect(stack.depth).toBe(1);
        expect(stack.isAt('universe')).toBe(true);
    });

    it('breadcrumb shows full path', () => {
        const stack = new LocationStack(1337);
        stack.push(galaxy);
        stack.push(system);
        expect(stack.breadcrumb()).toBe('Universe #1337 > NGC-1 > SYS-1');
    });

    it('serialize/deserialize round-trip preserves stack', () => {
        const stack = new LocationStack(42);
        stack.push(galaxy);
        stack.push(system);

        const restored = LocationStack.deserialize(stack.serialize());

        expect(restored.breadcrumb()).toBe(stack.breadcrumb());
        expect(restored.depth).toBe(3);
        expect(restored.current).toEqual(system);
    });

    it('deserialize rejects invalid payloads', () => {
        expect(() => LocationStack.deserialize('[]')).toThrow(LocationError);
        expect(() => LocationStack.deserialize('not json')).toThrow(LocationError);
        expect(() => LocationStack.deserialize('[{"kind":"galaxy"}]')).toThrow(LocationError);
    });
});
