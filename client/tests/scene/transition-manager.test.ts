// client/tests/scene/transition-manager.test.ts

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TransitionManager } from '../../src/scene/transition-manager.js';

function makeCamera(): THREE.PerspectiveCamera {
    return new THREE.PerspectiveCamera();
}

describe('TransitionManager', () => {
    it('starts in idle state', () => {
        const manager = new TransitionManager();
        expect(manager.getState()).toBe('idle');
        expect(manager.isTransitioning()).toBe(false);
    });

    it('transitions from start to end', () => {
        const manager = new TransitionManager();
        const camera = makeCamera();
        camera.position.set(0, 0, 0);

        manager.start({
            duration: 1.0,
            start: new THREE.Vector3(0, 0, 0),
            end: new THREE.Vector3(10, 0, 0),
        });

        expect(manager.isTransitioning()).toBe(true);

        // Половина перехода
        manager.update(0.5, camera);
        expect(camera.position.x).toBeCloseTo(5, 1);

        // Конец перехода
        manager.update(0.5, camera);
        expect(camera.position.x).toBeCloseTo(10, 1);
        expect(manager.isTransitioning()).toBe(false);
    });

    it('calls onComplete callback', () => {
        const manager = new TransitionManager();
        const camera = makeCamera();
        let completed = false;

        manager.start(
            {
                duration: 1.0,
                start: new THREE.Vector3(0, 0, 0),
                end: new THREE.Vector3(10, 0, 0),
            },
            undefined,
            () => {
                completed = true;
            },
        );

        manager.update(1.0, camera);

        expect(completed).toBe(true);
    });

    it('applies fov curve during transition', () => {
        const manager = new TransitionManager();
        const camera = makeCamera();
        camera.fov = 60;
        camera.updateProjectionMatrix();

        manager.start({
            duration: 1.0,
            start: new THREE.Vector3(0, 0, 0),
            end: new THREE.Vector3(10, 0, 0),
            fovFrom: 60,
            fovTo: 40,
        });

        manager.update(1.0, camera);

        expect(camera.fov).toBeCloseTo(40, 0);
    });

    it('restores exact end quaternion when provided', () => {
        const manager = new TransitionManager();
        const camera = makeCamera();

        const target = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(0.3, 0.5, 0, 'YXZ'),
        );

        manager.start({
            duration: 1.0,
            start: new THREE.Vector3(0, 0, 0),
            end: new THREE.Vector3(10, 0, 0),
            endQuaternion: target,
        });

        manager.update(1.0, camera);

        expect(camera.quaternion.x).toBeCloseTo(target.x, 3);
        expect(camera.quaternion.y).toBeCloseTo(target.y, 3);
        expect(camera.quaternion.z).toBeCloseTo(target.z, 3);
        expect(camera.quaternion.w).toBeCloseTo(target.w, 3);
    });

    it('does not snap orientation at start (smooth slerp)', () => {
        const manager = new TransitionManager();
        const camera = makeCamera();
        const startQuat = camera.quaternion.clone();

        manager.start({
            duration: 1.0,
            start: new THREE.Vector3(0, 0, 0),
            end: new THREE.Vector3(10, 0, 0),
            lookAt: new THREE.Vector3(10, 10, 0),
        });

        manager.update(0.25, camera);

        // Ориентация в процессе — между стартом и целью, не равна цели сразу.
        expect(camera.quaternion.equals(startQuat)).toBe(false);
    });

    it('calls onProgress with eased t', () => {
        const manager = new TransitionManager();
        const camera = makeCamera();
        const seen: number[] = [];
        manager.start({
            duration: 1.0,
            start: new THREE.Vector3(0, 0, 0),
            end: new THREE.Vector3(10, 0, 0),
            onProgress: (t) => seen.push(t),
        });
        manager.update(0.5, camera);
        manager.update(0.5, camera);
        expect(seen.length).toBeGreaterThanOrEqual(2);
        expect(seen[seen.length - 1]).toBeCloseTo(1, 1);
    });

    it('flash does not throw in node environment', () => {
        const manager = new TransitionManager();
        expect(() => manager.flash()).not.toThrow();
    });
});
