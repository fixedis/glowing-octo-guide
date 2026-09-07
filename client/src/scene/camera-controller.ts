// client/src/scene/camera-controller.ts

import * as THREE from 'three';

/**
 * Орбитальная камера карты ВСЕЛЕННОЙ («пол» XZ).
 *
 * Полностью та же механика, что у GalaxyOrbitCamera (карта галактики):
 *  - ЛКМ/ПКМ зажатые + drag — перетаскивание карты «захватом»
 *    (в осях диска: экранное вправо = +X, экранный вверх = −Z... точнее,
 *    камера смотрит с юга: экранный вверх = −Z мира);
 *  - колесо — ЗУМ (приближение/отдаление);
 *  - СКМ зажатая + drag по вертикали — угол обзора ±15% от базового.
 *
 * Отличие от галактики только в масштабах (радиус/дистанции) и центре.
 */
export class CameraController {
    /** Фокусная точка (мир) — центр экрана смотрит сюда. */
    private readonly target = new THREE.Vector3();
    /** Базовое возвышение над плоскостью «пола»: 63° — взгляд сверху
     * с наклоном ~30% от вертикали. */
    private readonly pitchBase = THREE.MathUtils.degToRad(63);
    private pitch = this.pitchBase;
    private pitchTarget = this.pitchBase;
    private static readonly PITCH_SPAN = 0.15;
    /** Текущая дистанция до фокуса и её цель (зум колесом). */
    private distance = 4400;
    private desiredDistance = 4400;
    private minDistance = 300;
    private maxDistance = 12000;
    /** Панорамная скорость фокуса (юнитов/сек). */
    private readonly panVelocity = new THREE.Vector3();

    private draggingPan = false;
    private draggingTilt = false;
    private lastX = 0;
    private lastY = 0;

    private domElement: HTMLElement | null = null;
    private attached = false;
    /** Ввод активен только когда карта вселенной владеет камерой. */
    private enabled = false;

    public constructor(
        private readonly camera: THREE.PerspectiveCamera,
    ) {
        void this.camera; // привязка через attach()
    }

    /**
     * Привязывает контролы к элементу. Повторный вызов состояние НЕ сбрасывает
     * (кроме первой привязки, выставляющей стартовую позу).
     */
    public attach(domElement: HTMLElement): void {
        if (this.domElement !== domElement) {
            this.unbind();
            this.domElement = domElement;
            this.bind();
        }
        if (!this.attached) {
            // Стартовый фокус — центр стартового чанка (500,500) на «полу»:
            // галактики чанка распределены по всей его площади.
            this.target.set(500, 0, 500);
            this.distance = 4400;
            this.desiredDistance = this.distance;
            this.pitch = this.pitchBase;
            this.pitchTarget = this.pitchBase;
            this.attached = true;
            // Сразу применяем позу, чтобы первый кадр был без прыжка.
            this.update(1 / 60);
        }
    }

    public isActive(): boolean {
        return this.attached;
    }

    public detach(): void {
        this.attached = false;
        this.draggingPan = false;
        this.draggingTilt = false;
    }

    public dispose(): void {
        this.unbind();
        this.domElement = null;
        this.attached = false;
    }

    /** Модуль текущей скорости камеры (юнитов/сек) — для пыли и аберрации. */
    public getSpeed(): number {
        return Math.abs(this.desiredDistance - this.distance);
    }

    /** Текущий фокус и дистанция — для согласования перелётов с камерой. */
    public getFocus(): { target: THREE.Vector3; distance: number } {
        return { target: this.target.clone(), distance: this.desiredDistance };
    }

    /** Принудительно выставляет фокус/дистанцию (после перелёта извне). */
    public setFocus(target: THREE.Vector3, distance: number): void {
        this.target.copy(target);
        this.target.y = 0;
        this.distance = distance;
        this.desiredDistance = distance;
    }

    /**
     * СБРОС УГЛА К БАЗЕ 63° (юзер: не запоминать угол на карте вселенной).
     * МГНОВЕННЫЙ (pitch и pitchTarget сразу в базу): перелёт Г→В уже
     * закончился в канонической ориентации 63°, поэтому первый кадр владения
     * контроллером обязан её воспроизводить — мягкое «дотягивание» давало бы
     * скачок назад к старому углу юзера. Зовётся при возврате на карту.
     */
    public resetTilt(): void {
        this.pitch = this.pitchBase;
        this.pitchTarget = this.pitchBase;
    }

    /**
     * Обновляет позу камеры. Вызывается, когда карта вселенной владеет камерой
     * (не во время переходов).
     */
    public update(dt: number, _camera?: THREE.PerspectiveCamera): void {
        if (!this.attached) return;
        const cam = _camera ?? this.camera;

        // --- Сглаженный зум.
        this.distance += (this.desiredDistance - this.distance) * Math.min(1, dt * 9);

        // --- Сглаженный наклон (СКМ+drag): dt*9, как у орбитальной камеры.
        this.pitch += (this.pitchTarget - this.pitch) * Math.min(1, dt * 9);

        // --- Поза «пол»: камера к ЮГУ от фокуса (+Z), ВЫШЕ плоскости (+Y).
        // ЕДИНАЯ конвенция с GalaxyOrbitCamera и переходом enterGalaxy.
        const ce = Math.cos(this.pitch);
        const se = Math.sin(this.pitch);
        cam.position.set(
            this.target.x,
            this.target.y + this.distance * se,
            this.target.z + this.distance * ce,
        );
        cam.lookAt(this.target);
    }

    /** Фокус практически не ограничен: карта бесконечна (чанки стримятся). */
    private clampTarget(): void {
        const limit = 1e6;
        const off = this.target.clone();
        off.x = THREE.MathUtils.clamp(off.x, -limit, limit);
        off.y = 0; // карта-«пол»: высота фокуса жёстко 0
        off.z = THREE.MathUtils.clamp(off.z, -limit, limit);
        this.target.copy(off);
    }

    private bind(): void {
        const el = this.domElement;
        if (!el) return;
        el.addEventListener('mousedown', this.onMouseDown);
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.onMouseUp);
        el.addEventListener('wheel', this.onWheel, { passive: false });
    }

    private unbind(): void {
        const el = this.domElement;
        if (!el) return;
        el.removeEventListener('mousedown', this.onMouseDown);
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
        el.removeEventListener('wheel', this.onWheel);
    }

    private readonly onMouseDown = (e: MouseEvent): void => {
        // Слушатели висят на canvas постоянно, но активен контроллер только
        // когда карта вселенной владеет камерой. Иначе колесо/драг на карте
        // галактики незаметно копили бы зум/панораму вселенной.
        if (!this.attached || !this.enabled) return;
        // СКМ: регулировка угла обзора (зажать и тянуть вверх/вниз).
        if (e.button === 1) {
            e.preventDefault();
            this.draggingTilt = true;
            this.lastY = e.clientY;
            return;
        }
        if (e.button === 0 || e.button === 2) {
            this.draggingPan = true;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        }
    };

    private readonly onMouseUp = (): void => {
        this.draggingPan = false;
        this.draggingTilt = false;
    };

    private readonly onMouseMove = (e: MouseEvent): void => {
        if (!this.attached || !this.enabled) return;
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;

        if (this.draggingTilt) {
            // Вертикаль мыши -> наклон в пределах ±15% базы (63°±9.45°).
            const span = CameraController.PITCH_SPAN * this.pitchBase;
            this.pitchTarget = THREE.MathUtils.clamp(
                this.pitchTarget - dy * 0.0025,
                this.pitchBase - span,
                this.pitchBase + span,
            );
            this.lastX = e.clientX;
            this.lastY = e.clientY;
            return;
        }
        if (!this.draggingPan) return;

        // ЛКМ/ПКМ-drag: карта следует за курсором — ЕДИННЫЕ знаки с
        // GalaxyOrbitCamera (drag вниз -> фокус z -= dy).
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        const s = this.distance * 0.0016;
        this.target.x -= dx * s;
        this.target.z -= dy * s;
        this.clampTarget();
    };

    private readonly onWheel = (e: WheelEvent): void => {
        // Колесо активно только во владении картой вселенной (иначе зум
        // карты галактики попутно менял бы зум вселенной).
        if (!this.attached || !this.enabled) return;
        e.preventDefault();
        // Колесо вверх — приближение, вниз — отдаление.
        this.desiredDistance = THREE.MathUtils.clamp(
            this.desiredDistance * (1 + e.deltaY * 0.0011),
            this.minDistance,
            this.maxDistance,
        );
    };

    /** Включает/выключает приём ввода (true = карта вселенной владеет камерой). */
    public setEnabled(on: boolean): void {
        this.enabled = on;
        if (!on) {
            this.draggingPan = false;
            this.draggingTilt = false;
        }
    }
}
