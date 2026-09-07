// client/src/scene/galaxy-orbit-camera.ts
import * as THREE from 'three';
import type { Galaxy } from '../core/types.js';

/**
 * Планарная камера карты галактики (фиксированный ракурс).
 *
 * Управление (в режиме galaxy-systems):
 *  - ЛКМ/ПКМ + drag — перетаскивание карты (лево/право/верх/низ);
 *  - колесо вверх   — приближение, колесо вниз — отдаление;
 *  - WASD           — то же перетаскивание с клавиатуры.
 *
 * Ракурс НЕИЗМЕНЕН: камера стоит на южном краю диска и поднята под 40°,
 * вся карта видна целиком. Вращения камеры нет — карта двигается под ней.
 * Стартовое положение совпадает с конечной точкой перелёта enterGalaxy.
 */
export class GalaxyOrbitCamera {
    /** Фокусная точка (мир). */
    private readonly target = new THREE.Vector3();
    /** Центр галактики — от него считаются лимиты панорамы. */
    private readonly center = new THREE.Vector3();
    /** Фиксированный ракурс: взгляд СВЕРХУ на карту с лёгким наклоном —
     * возвышение 63° (отклонение от вертикали всего ~30%). */
    private readonly pitchBase = THREE.MathUtils.degToRad(63);
    /** Текущий наклон; СКМ+drag плавно меняет его в пределах ±15% базы. */
    private pitch = THREE.MathUtils.degToRad(63);
    private static readonly PITCH_SPAN = 0.15; // 15% от базового угла
    /** Целевой наклон для сглаживания (меняется СКМ+drag). */
    private pitchTarget = THREE.MathUtils.degToRad(63);
    private distance = 100;
    private desiredDistance = 100;
    /** Панорамная скорость фокуса (юнитов/сек). */
    private readonly panVelocity = new THREE.Vector3();
    private radius = 60;
    private readonly keys = { left: false, right: false, fwd: false, back: false, up: false, down: false };
    private dragging: 0 | 1 | 2 | 3 = 0;
    private lastX = 0;
    private lastY = 0;
    private domElement: HTMLElement | null = null;
    private attached = false;

    /**
     * Привязывает контролы к элементу и центрирует орбиту на галактике.
     * Повторный вызов с той же галактикой состояние НЕ сбрасывает.
     */
    public attach(galaxy: Galaxy, domElement: HTMLElement): void {
        const sameCenter = this.attached && this.center.equals(new THREE.Vector3(galaxy.x, galaxy.y, galaxy.z));
        if (!sameCenter) {
            // Новый вход в галактику: камера над диском, возвышение 63°
            // (взгляд сверху с наклоном ~30% от вертикали). Дистанция R*2.4 —
            // ГАЛАКТИКА ЦЕЛИКОМ В КАДРЕ (геометрия: при fov 55° и возвышении
            // 63° ближний край диска на R*1.15 уходил за нижнюю границу кадра,
            // R*2.4 держит весь радиус внутри вертикального поля зрения).
            this.center.set(galaxy.x, galaxy.y, galaxy.z);
            this.target.copy(this.center);
            this.radius = Math.max(8, galaxy.radius);
            this.distance = this.radius * 2.4;
            this.desiredDistance = this.distance;
            this.panVelocity.set(0, 0, 0);
            // Ракурс сбрасывается к базовому при входе в новую галактику.
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

    /** Текущий фокус и дистанция — для согласования перелётов с камерой. */
    public getFocus(): { target: THREE.Vector3; distance: number; pitch: number } {
        return {
            target: this.target.clone(),
            distance: this.desiredDistance,
            pitch: this.pitch,
        };
    }

    public detach(): void {
        this.attached = false;
        this.dragging = 0;
        for (const k of Object.keys(this.keys) as Array<keyof typeof this.keys>) {
            this.keys[k] = false;
        }
    }

    public dispose(): void {
        this.unbind();
        this.domElement = null;
        this.attached = false;
    }

    /**
     * Обновляет позу камеры. Вызывается ПОСЛЕ контроллера свободного полёта —
     * в режиме галактики эта камера единолично владеет позой.
     */
    public update(dt: number, camera: THREE.PerspectiveCamera): void {
        if (!this.attached) return;

        // --- Панорама клавишами (WASD) — в осях диска (X и -Z), как ЛКМ-drag.
        const panSpeed = this.distance * 0.7;
        const wish = new THREE.Vector3();
        if (this.keys.right) wish.x += 1;
        if (this.keys.left) wish.x -= 1;
        if (this.keys.up || this.keys.fwd) wish.z -= 1;
        if (this.keys.down || this.keys.back) wish.z += 1;
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

        // --- Сглаженный зум.
        this.distance += (this.desiredDistance - this.distance) * Math.min(1, dt * 9);

        // --- Сглаженный наклон: pitch тянется к целевому, выставляемому
        // зажатой СКМ + вертикальным движением мыши (±15% от базы).
        const minPitch = this.pitchBase * (1 - GalaxyOrbitCamera.PITCH_SPAN);
        const maxPitch = this.pitchBase * (1 + GalaxyOrbitCamera.PITCH_SPAN);
        const clamped = THREE.MathUtils.clamp(this.pitchTarget, minPitch, maxPitch);
        this.pitch += (clamped - this.pitch) * Math.min(1, dt * 9);

        // --- Поза: камера согласована с перелётом enterGalaxy (тот же угол,
        // тот же сектор: +Y и +Z от фокуса). Ось панорамы ЛКМ согласована
        // с экранными осями этой позы (см. onMouseMove).
        const cp = Math.cos(this.pitch);
        camera.position.set(
            this.target.x,
            this.target.y + this.distance * Math.sin(this.pitch),
            this.target.z + this.distance * cp,
        );
        camera.lookAt(this.target);
    }

    /** Фокус не уходит дальше окрестности галактики.
     * Диск лежит горизонтально: y фокуса жёстко прижат к центру. */
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
        // СКМ: начало регулировки наклона (зажать и тянуть вверх/вниз).
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
            // СКМ+drag: вертикаль мыши -> наклон камеры в пределах ±15% базы.
            const span = GalaxyOrbitCamera.PITCH_SPAN * this.pitchBase;
            this.pitchTarget = THREE.MathUtils.clamp(
                this.pitchTarget - dy * 0.0025,
                this.pitchBase - span,
                this.pitchBase + span,
            );
            return;
        }
        // ЛКМ/ПКМ — перетаскивание карты «захватом»: карта следует за курсором.
        // ОСИ СОГЛАСОВАНЫ С ДИСКОМ: слой галактики повёрнут rotation.x=-90°,
        // поэтому локальная X диска = мировая X, локальная Y диска = мировая
        // -Z. Drag по экрану двигает фокус в этих мировых осях — карта едет
        // 1:1 за курсором, высота камеры не меняется.
        const s = this.distance * 0.0016;
        this.target.x -= dx * s;
        this.target.z -= dy * s;
        this.clampTarget();
    };

    private readonly onWheel = (e: WheelEvent): void => {
        if (!this.attached) return;
        e.preventDefault();
        const min = this.radius * 0.22;
        // Отдаление увеличено (x4 -> x10): галактику можно отдалить почти
        // втрое дальше обзорной позы перелёта (radius*1.15), чтобы увидеть
        // её целиком издалека.
        const max = this.radius * 10;
        // Колесо вверх — приближение, колесо вниз — отдаление.
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
            case 'KeyQ': case 'Space': this.keys.up = true; break;
            case 'KeyE': case 'ShiftLeft': case 'ShiftRight': this.keys.down = true; break;
            default: return;
        }
    };

    private readonly onKeyUp = (e: KeyboardEvent): void => {
        switch (e.code) {
            case 'KeyA': this.keys.left = false; break;
            case 'KeyD': this.keys.right = false; break;
            case 'KeyW': this.keys.fwd = false; break;
            case 'KeyS': this.keys.back = false; break;
            case 'KeyQ': case 'Space': this.keys.up = false; break;
            case 'KeyE': case 'ShiftLeft': case 'ShiftRight': this.keys.down = false; break;
            default: return;
        }
    };
}
