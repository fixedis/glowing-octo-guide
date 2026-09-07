// client/src/scene/transition-manager.ts
import * as THREE from 'three';

export interface TransitionConfig {
    readonly duration: number;
    /** Старт прямой/Безье-траектории (не нужен для approach/spiral). */
    readonly start?: THREE.Vector3 | undefined;
    /** Конец прямой/Безье-траектории (не нужен для approach/spiral). */
    readonly end?: THREE.Vector3 | undefined;
    /** Куда смотреть в конце (плавный доворот), если нет endQuaternion. */
    readonly lookAt?: THREE.Vector3 | undefined;
    /**
     * ТРЕКИНГ-ЦЕЛЬ: камера каждый кадр смотрит на неё, а стартовый угловой
     * сдвиг (где точка была на экране при клике) плавно гаснет к нулю.
     * Цель скользит от точки клика к перекрестию и держится там — «линнейка».
     */
    readonly trackLookAt?: THREE.Vector3 | undefined;
    /** Точная ориентация в конце (для возврата в сохранённую позу). */
    readonly endQuaternion?: THREE.Quaternion | undefined;
    readonly fovFrom?: number;
    readonly fovTo?: number;
    /** Прогресс 0..1 для управления fade/scale слоёв во время полёта. */
    readonly onProgress?: ((t: number) => void) | undefined;
    /**
     * Если true, onProgress получает СЫРОЙ линейный прогресс (без easing).
     * Нужно для фаз, привязанных к реальному времени полёта («мгновенное»
     * гашение сетки), а не к кривой скорости камеры.
     */
    readonly progressRaw?: boolean | undefined;
    /**
     * Контрольная точка криволинейной траектории (квадратичная Безье).
     * Камера летит по дуге: разгон вдоль нити/касательной, затем выравнивание.
     */
    readonly control?: THREE.Vector3 | undefined;
    /**
     * Физическая траектория «гравитационный манёвр»: камера притягивается
     * к цели (focus) с логарифмическим профилем дистанции — объект растёт
     * с постоянной УГЛОВОЙ скоростью (закон Вебера), как при реальном
     * сближении. При задании focus параметры start/end/control игнорируются:
     * позиция строится из r(u), направления и угла возвышения.
     */
    readonly approach?: {
        /** Мировая точка цели (звезда/галактика). */
        readonly focus: THREE.Vector3;
        /** Стартовая дистанция камеры до цели. */
        readonly from: number;
        /** Финальная орбитальная дистанция. */
        readonly to: number;
        /** Стартовое направление взгляда (единичный вектор). */
        readonly fromDir: THREE.Vector3;
        /** Финальное направление взгляда (единичный вектор). */
        readonly toDir: THREE.Vector3;
        /** Глубина «погружения» к цели в середине пути (0..1). */
        readonly dip?: number | undefined;
    } | undefined;
    /**
     * Огибающая тряски камеры: [head, tail] — сила вибрации в начале и в конце
     * полёта (турбулентность входа в атмосферу). Значения — амплитуды в юнитах.
     */
    readonly shakeHead?: number | undefined;
    readonly shakeTail?: number | undefined;
}
export type TransitionState = 'idle' | 'transitioning';

/** Единичный кватернион для гашения стартового углового сдвига (трекинг). */
const IDENTITY_Q = new THREE.Quaternion();

function easeInOutCubic(p: number): number {
    return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

export class TransitionManager {
    private state: TransitionState = 'idle';
    private progress = 0;
    private config: TransitionConfig | null = null;
    private onComplete: (() => void) | undefined;
    private initialized = false;
    private readonly startQuat = new THREE.Quaternion();
    private readonly endQuat = new THREE.Quaternion();
    /** Замороженный угловой сдвиг «клик -> перекрестие» для режима трекинга. */
    private readonly trackOffset = new THREE.Quaternion();
    private readonly tmpA = new THREE.Vector3();
    private readonly tmpB = new THREE.Vector3();

    public getState(): TransitionState { return this.state; }
    public isTransitioning(): boolean { return this.state === 'transitioning'; }

    public start(config: TransitionConfig, onStart?: () => void, onComplete?: () => void): void {
        if (this.state === 'transitioning') return;
        this.config = config;
        this.progress = 0;
        this.initialized = false;
        this.state = 'transitioning';
        this.onComplete = onComplete;
        if (onStart) onStart();
    }

    public update(dt: number, camera: THREE.PerspectiveCamera): void {
        if (this.state !== 'transitioning' || !this.config) return;
        if (!this.initialized) {
            this.initialized = true;
            this.captureOrientations(camera);
        }
        this.progress += dt / this.config.duration;
        const done = this.progress >= 1;
        const t = done ? 1 : this.progress;
        this.applyFrame(t, camera);
        if (this.config.onProgress) {
            this.config.onProgress(this.config.progressRaw ? t : easeInOutCubic(t));
        }
        if (done) {
            this.state = 'idle';
            this.initialized = false;
            const cb = this.onComplete;
            this.config = null;
            this.onComplete = undefined;
            if (cb) cb();
        }
    }

    public flash(): void {
        if (typeof document === 'undefined') {
            return;
        }

        const overlay = document.createElement('div');
        overlay.style.cssText = [
            'position:fixed', 'inset:0', 'z-index:100', 'pointer-events:none',
            'opacity:0.85', 'transition:opacity 0.6s ease-out',
            'background:radial-gradient(circle at 50% 50%,',
            'rgba(220,240,255,0.95) 0%,',
            'rgba(120,170,255,0.5) 35%,',
            'rgba(10,20,40,0) 75%)',
        ].join(';');
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.style.opacity = '0';
        });

        setTimeout(() => overlay.remove(), 700);
    }

    private captureOrientations(camera: THREE.PerspectiveCamera): void {
        if (!this.config) return;
        this.startQuat.copy(camera.quaternion);
        if (this.config.trackLookAt) {
            // Трекинг: offset замораживаем ОДИН раз против СТАРТОВОЙ позиции:
            // start = track0 · offset. endQuat = track0 (взгляд из конца).
            if (!this.config.end) { this.endQuat.copy(this.startQuat); return; }
            const m = new THREE.Matrix4();
            m.lookAt(this.config.end, this.config.trackLookAt, new THREE.Vector3(0, 1, 0));
            this.endQuat.setFromRotationMatrix(m);
            const m0 = new THREE.Matrix4();
            m0.lookAt(camera.position, this.config.trackLookAt, new THREE.Vector3(0, 1, 0));
            this.trackOffset.setFromRotationMatrix(m0).invert().multiply(this.startQuat);
            return;
        }
        if (this.config.endQuaternion) { this.endQuat.copy(this.config.endQuaternion); return; }
        if (this.config.lookAt && this.config.end) {
            const m = new THREE.Matrix4();
            m.lookAt(this.config.end, this.config.lookAt, new THREE.Vector3(0, 1, 0));
            this.endQuat.setFromRotationMatrix(m);
            return;
        }
        this.endQuat.copy(this.startQuat);
    }

    private applyFrame(raw: number, camera: THREE.PerspectiveCamera): void {
        if (!this.config) return;
        const t = easeInOutCubic(THREE.MathUtils.clamp(raw, 0, 1));
        const cfg = this.config;

        // --- Позиция.
        if (cfg.approach) {
            // Гравитационный манёвр: r(u) — лог-интерполяция дистанции с
            // «погружением» к цели в середине пути (periapsis swing-by).
            const a = cfg.approach;
            const dip = a.dip ?? 0;
            const lnR = THREE.MathUtils.lerp(Math.log(a.from), Math.log(a.to), t);
            let r = Math.exp(lnR);
            if (dip > 0) r *= 1 - dip * Math.sin(Math.PI * t);

            // Направление от цели на камеру: сферическая интерполяция
            // стартового и целевого направлений (кратчайшая дуга).
            this.tmpA.copy(a.fromDir).normalize();
            this.tmpB.copy(a.toDir).normalize();
            // Угол между направлениями (для устойчивого slerp вручную).
            const dot = THREE.MathUtils.clamp(this.tmpA.dot(this.tmpB), -1, 1);
            const omega = Math.acos(dot);
            if (omega < 1e-4) {
                this.tmpA.copy(a.toDir);
            } else {
                const sSin = Math.sin(omega);
                const w0 = Math.sin((1 - t) * omega) / sSin;
                const w1 = Math.sin(t * omega) / sSin;
                this.tmpA.multiplyScalar(w0).addScaledVector(this.tmpB, w1).normalize();
            }
            camera.position.copy(a.focus)
                .addScaledVector(this.tmpA, r);
        } else if (cfg.control && cfg.start && cfg.end) {
            // Безье B(t) = (1-t)^2 P0 + 2(1-t)t C + t^2 P1.
            const u = 1 - t;
            this.tmpA.copy(cfg.start).multiplyScalar(u * u);
            this.tmpB.copy(cfg.control).multiplyScalar(2 * u * t);
            this.tmpA.add(this.tmpB);
            this.tmpB.copy(cfg.end).multiplyScalar(t * t);
            camera.position.copy(this.tmpA.add(this.tmpB));
        } else if (cfg.start && cfg.end) {
            camera.position.lerpVectors(cfg.start, cfg.end, t);
        }

        // Тряска: огибающая head/tail поверх базовой позиции.
        // Огибающие обращаются в 0 на границах окна, чтобы камера НЕ
        // приземлялась с остаточным смещением (иначе дрейф копится
        // через capturePose обратных перелётов).
        let amp = 0;
        if (cfg.shakeHead !== undefined && raw < 0.35) {
            const p = raw / 0.35;
            amp += cfg.shakeHead * Math.sin(p * Math.PI);
        }
        if (cfg.shakeTail !== undefined && raw >= 0.65 && raw <= 1) {
            const p = (raw - 0.65) / 0.35;
            amp += cfg.shakeTail * Math.sin(p * Math.PI);
        }
        if (amp > 0) {
            // Детерминированное время от прогресса перехода, а не
            // performance.now(): одинаковый кадр => одинаковое смещение.
            const time = this.progress * this.config.duration;
            camera.position.x += Math.sin(time * 47.3) * amp;
            camera.position.y += Math.sin(time * 38.7 + 1.7) * amp;
            camera.position.z += Math.sin(time * 52.9 + 3.1) * amp;
        }

        camera.quaternion.slerpQuaternions(this.startQuat, this.endQuat, t);
        if (cfg.trackLookAt) {
            // Трекинг-доводка: q(t) = track(pos(t)) · decay(t), decay гасит
            // ЗАМОРОЖЕННЫЙ сдвиг trackOffset (посчитан один раз на старте).
            // t=0: track0·offset=start; t=1: цель в перекрестии.
            const m = new THREE.Matrix4();
            m.lookAt(camera.position, cfg.trackLookAt, new THREE.Vector3(0, 1, 0));
            const track = new THREE.Quaternion().setFromRotationMatrix(m);
            const decay = new THREE.Quaternion()
                .slerpQuaternions(this.trackOffset, IDENTITY_Q, t);
            camera.quaternion.copy(decay.premultiply(track));
        }
        if (cfg.fovFrom !== undefined && cfg.fovTo !== undefined) {
            camera.fov = cfg.fovFrom + (cfg.fovTo - cfg.fovFrom) * t;
            camera.updateProjectionMatrix();
        }
    }
}
