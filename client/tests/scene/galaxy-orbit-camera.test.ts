// client/tests/scene/galaxy-orbit-camera.test.ts
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GalaxyOrbitCamera } from '../../src/scene/galaxy-orbit-camera.js';
import type { Galaxy } from '../../src/core/types.js';

const GALAXY: Galaxy = {
    seed: 42,
    name: 'NGC-TEST',
    type: 'spiral',
    x: -100,
    y: 200,
    z: 50,
    radius: 60,
};

function makeEnv() {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const cam = new THREE.PerspectiveCamera(55, 1.5, 0.1, 6000);
    const orbit = new GalaxyOrbitCamera();
    orbit.attach(GALAXY, el);
    // Сходимость сглаживания: 40 кадров по 1/60 c.
    const settle = (frames = 40): void => {
        for (let i = 0; i < frames; i++) orbit.update(1 / 60, cam);
    };
    return { el, cam, orbit, settle };
}

function mouse(el: Element, type: string, init: MouseEventInit = {}): void {
    el.dispatchEvent(new MouseEvent(type, init));
}

function key(code: string, down: boolean): void {
    window.dispatchEvent(new (down ? KeyboardEvent : KeyboardEvent)(down ? 'keydown' : 'keyup', { code }));
}

describe('GalaxyOrbitCamera (управление картой галактики)', () => {
    it('стартует с ракурса конца перелёта: подъём 63°, дистанция radius*2.4 (галактика целиком)', () => {
        const { cam, orbit, settle } = makeEnv();
        settle();
        const d = GALAXY.radius * 2.4;
        const p = Math.sin(THREE.MathUtils.degToRad(63)) * d;
        expect(cam.position.x).toBeCloseTo(GALAXY.x, 3);
        expect(cam.position.y).toBeCloseTo(GALAXY.y + p, 2);
        expect(cam.position.z).toBeCloseTo(GALAXY.z + d * Math.cos(THREE.MathUtils.degToRad(63)), 2);
        orbit.dispose();
    });

    it('ЛКМ-drag вращает камеру вокруг галактики', () => {
        const { el, cam, orbit, settle } = makeEnv();
        settle();
        const before = cam.position.clone();
        mouse(el, 'mousedown', { button: 0, clientX: 400, clientY: 300 });
        for (let i = 1; i <= 10; i++) {
            window.dispatchEvent(new MouseEvent('mousemove', { clientX: 400 + i * 30, clientY: 300 }));
        }
        window.dispatchEvent(new MouseEvent('mouseup'));
        settle();
        expect(cam.position.distanceTo(before)).toBeGreaterThan(20);
        orbit.dispose();
    });

    it('колесо зумит: приближение при прокрутке вверх', () => {
        const { el, cam, orbit, settle } = makeEnv();
        settle();
        const distBefore = cam.position.distanceTo(new THREE.Vector3(GALAXY.x, GALAXY.y, GALAXY.z));
        el.dispatchEvent(new WheelEvent('wheel', { deltaY: -600, cancelable: true }));
        settle();
        const distAfter = cam.position.distanceTo(new THREE.Vector3(GALAXY.x, GALAXY.y, GALAXY.z));
        expect(distAfter).toBeLessThan(distBefore * 0.95);
        orbit.dispose();
    });

    it('WASD панорамирует фокус в пределах окрестности галактики', () => {
        const { cam, orbit, settle } = makeEnv();
        settle();
        key('KeyD', true);
        for (let i = 0; i < 120; i++) orbit.update(1 / 60, cam);
        key('KeyD', false);
        settle();
        // Фокус сместился вправо (+x в базисе yaw=0), но не дальше radius*1.2.
        expect(cam.position.x - GALAXY.x).toBeGreaterThan(1);
        expect(Math.abs(cam.position.x - GALAXY.x)).toBeLessThanOrEqual(GALAXY.radius * 1.25);
        orbit.dispose();
    });

    it('pitch ограничен: под диск и в зенит не уйти', () => {
        const { el, cam, orbit, settle } = makeEnv();
        // Тянем сильно вниз, затем сильно вверх.
        mouse(el, 'mousedown', { button: 0, clientX: 400, clientY: 300 });
        for (let i = 1; i <= 20; i++) {
            window.dispatchEvent(new MouseEvent('mousemove', { clientX: 400, clientY: 300 + i * 50 }));
        }
        window.dispatchEvent(new MouseEvent('mouseup'));
        settle();
        const dyMin = cam.position.y - GALAXY.y;
        expect(dyMin).toBeGreaterThan(GALAXY.radius * 0.05); // выше плоскости диска
        mouse(el, 'mousedown', { button: 0, clientX: 400, clientY: 300 });
        for (let i = 1; i <= 20; i++) {
            window.dispatchEvent(new MouseEvent('mousemove', { clientX: 400, clientY: 300 - i * 80 }));
        }
        window.dispatchEvent(new MouseEvent('mouseup'));
        settle();
        // Не выше 85°: горизонтальная дистанция до цели не обнуляется.
        const horiz = Math.hypot(cam.position.x - GALAXY.x, cam.position.z - GALAXY.z);
        expect(horiz).toBeGreaterThan(1);
        orbit.dispose();
    });

    it('detach отключает управление, повторный attach к той же галактике сохраняет позу', () => {
        const { el, cam, orbit, settle } = makeEnv();
        settle();
        orbit.detach();
        mouse(el, 'mousedown', { button: 0, clientX: 400, clientY: 300 });
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 900, clientY: 300 }));
        window.dispatchEvent(new MouseEvent('mouseup'));
        const before = cam.position.clone();
        orbit.update(1 / 60, cam);
        expect(cam.position.distanceTo(before)).toBeCloseTo(0, 6);

        // Повторный attach к ТОЙ ЖЕ галактике — состояние не сбрасывается.
        orbit.attach(GALAXY, el);
        settle();
        expect(cam.position.distanceTo(before)).toBeLessThan(0.001);
        orbit.dispose();
    });
});
