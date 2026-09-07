// client/src/scene/system-orbit-camera.ts

import * as THREE from 'three';

/**
 * Орбитальная камера карты ЗВЁЗДНОЙ СИСТЕМЫ.
 *
 * Полностью та же механика, что у карты галактики и карты вселенной
 * (единая конвенция «карта = пол», порядок Эйлера ZXY):
 *  - ЛКМ/ПКМ зажатые + drag — перетаскивание карты в плоскости орбит;
 *  - колесо — зум;
 *  - СКМ зажатая + drag по вертикали — угол обзора ±15% от базы 63°
 *    (взгляд сверху с наклоном ~30% от вертикали).
 *
 * Отличие только в масштабах (радиус системы) и центре (звезда).
 */
export class SystemOrbitCamera {
    /** Фокусная точка (мир) — звезда. */
    private readonly target = new THREE.Vector3();
    /** Центр системы — от него считаются лимиты панорамы. */
    private readonly center = new THREE.Vector3();
    /** Базовое возвышение над плоскостью орбит — единое для всех карт. */
    private readonly pitchBase = THREE.MathUtils.degToRad(63);
    private pitch = this.pitchBase;
    private pitchTarget = this.pitchBase;
    private static readonly PITCH_SPAN = 0.15; // ±15% от базы
    private distance = 100;
    private desiredDistance = 100;
    /** Панорамная скорость фокуса (юнитов/сек). */
    private readonly panVelocity = new THREE.Vector3();
    private radius = 60;
    private readonly keys = { left: false, right: false, fwd: false, back: false };
    private dragging: 0 | 1 | 2 | 3 = 0;
    private lastX = 0;
    private lastY = 0;
    private domElement: HTMLElement | null = null;
    private attached = false;

    /**
     * Привязывает контролы и центрирует орбиту на звезде.
     * Повторный вызов с тем же центром состояние НЕ сбрасывает.
     */
    public attach(center: THREE.Vector3, radius: number, distance: number, domElement: HTMLElement): void {
        const sameCenter = this.attached && this.center.equals(center);
        if (!sameCenter) {
            // Новый вход в систему: та же поза, в которую приводит перелёт
            // enterSystem (63°, ОБЗОРНАЯ дистанция radius*2.4 — как эталон
            // вселенная→галактика) — стык без рывка.
            this.center.copy(center);
            this.target.copy(center);
            this.radius = Math.max(4, radius);
            const d = Math.max(radius * 0.22, distance);
            this.distance = d;
            this.desiredDistance = d;
            this.panVelocity.set(0, 0, 0);
            this.pitch = this.pitchBase;
            this.pitchTarget = this.pitchBase;
        }
        if (this.domElement !== domElement) {
            this.unbind();
            this.domElement = domElement;
            this.bind();
        }
        this.attached = true;
    }

    public isActive(): boolean {
        return this.attached;
    }

    /** Текущий фокус/дистанция/угол — для согласования перелётов. */
    public getFocus(): { target: THREE.Vector3; distance: number; pitch: number } {
        return { target: this.target.clone(), distance: this.desiredDistance, pitch: this.pitch };
    }

    public detach(): void {
        this.attached = false;
        this.dragging = 0;
        this.keys.left = this.keys.right = this.keys.fwd = this.keys.back = false;
    }

    public dispose(): void {
        this.unbind();
        this.domElement = null;
        this.attached = false;
    }

    public update(dt: number, camera: THREE.PerspectiveCamera): void {
        if (!this.attached) return;

        // --- Панорама клавишами (WASD) — в плоскости орбит (X/Z).
        const panSpeed = this.distance * 0.7;
        const wish = new THREE.Vector3();
        if (this.keys.right) wish.x += 1;
        if (this.keys.left) wish.x -= 1;
        if (this.keys.fwd) wish.z -= 1;
        if (this.keys.back) wish.z += 1;
        if (wish.lengthSq() > 0) {
            wish.normalize().multiplyScalar(panSpeed);
            this.panVelocity.lerp(wish, Math.min(1, dt * 8));
        } else {
            this.panVelocity.multiplyScalar(Math.exp(-6 * dt));
        }
        if (this.panVelocity.lengthSq() > 1e-6) {
            this.target.addScaledVector(this.panVelocity, dt);
            this.clampTarget();
        }

        // --- Сглаженный зум и наклон (dt*9 — единый темп всех карт).
        this.distance += (this.desiredDistance - this.distance) * Math.min(1, dt * 9);
        const span = SystemOrbitCamera.PITCH_SPAN * this.pitchBase;
        const clamped = THREE.MathUtils.clamp(this.pitchTarget, this.pitchBase - span, this.pitchBase + span);
        this.pitch += (clamped - this.pitch) * Math.min(1, dt * 9);

        // --- Поза «пол»: камера к югу (+Z) и выше (+Y), смотрит на звезду.
        camera.position.set(
            this.target.x,
            this.target.y + this.distance * Math.sin(this.pitch),
            this.target.z + this.distance * Math.cos(this.pitch),
        );
        camera.lookAt(this.target);
    }

    /** Фокус не уходит дальше окрестности системы; высота жёстко на звезде. */
    private clampTarget(): void {
        const limit = this.radius * 1.2;
        const off = this.target.clone().sub(this.center);
        off.x = THREE.MathUtils.clamp(off.x, -limit, limit);
        off.z = THREE.MathUtils.clamp(off.z, -limit, limit);
        off.y = 0;
        this.target.copy(this.center).add(off);
    }

    private bind(): void {
        const el = this.domElement;
        if (!el) return;
        el.addEventListener('mousedown', this.onMouseDown);
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.onMouseUp);
        el.addEventListener('wheel', this.onWheel, { passive: false });
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        el.addEventListener('contextmenu', this.onContextMenu);
    }

    private unbind(): void {
        const el = this.domElement;
        if (!el) return;
        el.removeEventListener('mousedown', this.onMouseDown);
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
        el.removeEventListener('wheel', this.onWheel);
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        el.removeEventListener('contextmenu', this.onContextMenu);
    }

    private readonly onContextMenu = (e: Event): void => {
        if (this.attached) e.preventDefault();
    };

    private readonly onMouseDown = (e: MouseEvent): void => {
        if (!this.attached) return;
        if (e.button === 1) {
            e.preventDefault();
            this.dragging = 3;
            this.lastY = e.clientY;
            return;
        }
        if (e.button === 0 || e.button === 2) {
            this.dragging = e.button === 0 ? 1 : 2;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        }
    };

    private readonly onMouseUp = (): void => {
        this.dragging = 0;
    };

    private readonly onMouseMove = (e: MouseEvent): void => {
        if (!this.attached || this.dragging === 0) return;
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        if (this.dragging === 3) {
            // СКМ+drag: наклон в пределах ±15% базы (единые правила).
            const span = SystemOrbitCamera.PITCH_SPAN * this.pitchBase;
            this.pitchTarget = THREE.MathUtils.clamp(
                this.pitchTarget - dy * 0.0025,
                this.pitchBase - span,
                this.pitchBase + span,
            );
            return;
        }
        // ЛКМ/ПКМ — карта следует за курсором (единые знаки: x-=dx, z-=dy).
        const s = this.distance * 0.0016;
        this.target.x -= dx * s;
        this.target.z -= dy * s;
        this.clampTarget();
    };

    private readonly onWheel = (e: WheelEvent): void => {
        if (!this.attached) return;
        e.preventDefault();
        const min = this.radius * 0.22;
        // Отдаление x2.6 (подвинул юзер от 2.1: «чуть подальше надо»).
        const max = this.radius * 2.6;
        this.desiredDistance = THREE.MathUtils.clamp(
            this.desiredDistance * (1 + e.deltaY * 0.0011),
            min,
            max,
        );
    };

    private readonly onKeyDown = (e: KeyboardEvent): void => {
        if (!this.attached) return;
        switch (e.code) {
            case 'KeyA': this.keys.left = true; break;
            case 'KeyD': this.keys.right = true; break;
            case 'KeyW': this.keys.fwd = true; break;
            case 'KeyS': this.keys.back = true; break;
            default: return;
        }
    };

    private readonly onKeyUp = (e: KeyboardEvent): void => {
        switch (e.code) {
            case 'KeyA': this.keys.left = false; break;
            case 'KeyD': this.keys.right = false; break;
            case 'KeyW': this.keys.fwd = false; break;
            case 'KeyS': this.keys.back = false; break;
            default: return;
        }
    };
}
