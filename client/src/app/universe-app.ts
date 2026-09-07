// client/src/app/universe-app.ts

import * as THREE from 'three';
import type { UniverseClient } from '../api/universe-client.js';
import type { Galaxy, Planet, StarSystem } from '../core/types.js';
import { CameraController } from '../scene/camera-controller.js';
import { GalaxyOrbitCamera } from '../scene/galaxy-orbit-camera.js';
import { SystemOrbitCamera } from '../scene/system-orbit-camera.js';
import { PostFx } from '../scene/fx/post-fx.js';
import { SpeedDust } from '../scene/fx/speed-dust.js';
import { SceneManager, type SceneMode } from '../scene/scene-manager.js';

export interface AppDependencies {
    readonly container: HTMLElement;
    readonly universeSeed: number;
    readonly client: UniverseClient;
    readonly onSystemSelected?: (galaxy: Galaxy, system: StarSystem) => void;
}

export class UniverseApp {
    private readonly renderer: THREE.WebGLRenderer;
    private readonly camera: THREE.PerspectiveCamera;
    private readonly sceneManager: SceneManager;
    private readonly controller: CameraController;
    /** Орбитальная камера карты галактики (владеет позой в galaxy-systems). */
    private readonly orbit = new GalaxyOrbitCamera();
    /** Орбитальная камера карты звёздной системы (единая механика). */
    private readonly systemOrbit = new SystemOrbitCamera();
    private readonly postFx: PostFx;
    private readonly dust: SpeedDust;
    private readonly raycaster = new THREE.Raycaster();
    /** Увеличенный радиус попадания: сферы систем/планет крошечные (0.4-0.7
     * юнита), без запаса в них почти невозможно попасть мышью. */
    private static readonly PICK_THRESHOLD = 1.2;
    private readonly pointer = new THREE.Vector2();
    private lastTime = 0;
    private frameNo = 0;
    private running = true;
    private selected: Galaxy | StarSystem | Planet | null = null;
    private count = 0;
    private lastCrumb = '';
    private wasTransitioning = false;
    /** Позиция камеры в прошлом кадре — для фактической скорости (пыль). */
    private readonly prevCamPos = new THREE.Vector3();
    private prevCamPosValid = false;
    private dbgEl: HTMLElement | null = null;
    private pxSamples = 'n/a';
    /** TEMP: тумблеры фильтров (удалить после настройки). */
    private readonly fxToggles: Record<string, boolean> = {
        bloom: true,
        aberration: false,
        dust: true,
        weather: true,
        dof: false,
        postMaster: true,
    };
    private fxPanel: HTMLElement | null = null;
    /** TEMP: сглаженная интенсивность мастер-поста (кроссфейд уровней). */
    private postIntensity = 1;

    public constructor(private readonly deps: AppDependencies) {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        deps.container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            100000,
        );
        this.camera.position.set(0, 250, 4400);

        this.postFx = new PostFx(this.renderer);
        // Счётчик drawCalls на весь кадр (сцена + пост-проход),
        // иначе info.render показывает только последний рендер (=1).
        this.renderer.info.autoReset = false;
        this.dust = new SpeedDust();
        this.sceneManager = new SceneManager(deps.universeSeed, deps.client, {
            onGalaxySelected: (_galaxy) => {
                // Позицию камеры задаёт TransitionManager (конец полёта над
                // диском галактики) — никакого телепорта здесь быть не должно:
                // ручной set() перечёркивал финальную точку Безье-траектории.
                this.updateHud();
            },
        });

        this.controller = new CameraController(this.camera);
        this.controller.attach(this.renderer.domElement);
        // TEMP DEBUG: доступ к камере для диагностики вида «над/под картой».
        (window as unknown as Record<string, unknown>)['__uni'] = {
            camera: this.camera,
            // TEMP DEBUG: доступ к менеджеру для живых тестов перелётов.
            sm: this.sceneManager,
            // TEMP DEBUG: орбитные камеры — для тестов возвратов и фокусов.
            orbit: this.orbit,
        };
        // Пыль живёт в общей литой сцене.
        this.sceneManager.getScene().add(this.dust.getObject());
        // DoF-управление пробрасывается в SceneManager.
        this.sceneManager.setPostFx(this.postFx);

        // TEMP DEBUG: живой статус сцены (удалить после отладки).
        const dbg = document.createElement('div');
        dbg.id = 'dbg';
        dbg.style.cssText = 'position:fixed;bottom:8px;left:8px;font:11px monospace;color:#9fe89f;z-index:3;white-space:pre;text-shadow:0 0 3px #000;';
        document.body.appendChild(dbg);
        this.dbgEl = dbg;

        // TEMP DEBUG: панель тумблеров ВСЕХ фильтров движка (удалить после настройки).
        this.buildFxPanel();

        this.bindEvents();
        this.updateHud();
        requestAnimationFrame(this.loop);
    }

    /** TEMP: панель тумблеров фильтров (удалить после настройки). */
    private buildFxPanel(): void {
        const panel = document.createElement('div');
        panel.id = 'fxpanel';
        panel.style.cssText = 'position:fixed;bottom:8px;right:8px;z-index:20;display:flex;flex-direction:column;gap:4px;background:rgba(0,0,0,.65);padding:8px;border:1px solid #3a5a3a;border-radius:6px;font:11px monospace;max-height:calc(100vh - 60px);overflow-y:auto;';
        const title = document.createElement('div');
        title.textContent = 'ФИЛЬТРЫ (TEMP)';
        title.style.cssText = 'color:#9fe89f;letter-spacing:1px;margin-bottom:2px;';
        panel.appendChild(title);
        const labels: Record<string, string> = {
            bloom: 'Bloom (свечение)',
            aberration: 'Аберрация RGB',
            dust: 'Пыль скорости',
            weather: 'Погода (дождь/снег)',
            dof: 'DoF (размытие)',
            postMaster: 'Мастер-пост (весь)',
        };
        for (const key of Object.keys(this.fxToggles)) {
            const btn = document.createElement('button');
            btn.dataset.fx = key;
            const refresh = (): void => {
                const on = this.fxToggles[key]!;
                btn.textContent = `${on ? '●' : '○'} ${labels[key] ?? key}`;
                btn.style.color = on ? '#9fe89f' : '#666';
                btn.style.borderColor = on ? '#3a5a3a' : '#333';
            };
            btn.style.cssText = 'background:#0a120a;border:1px solid #333;color:#9fe89f;font:11px monospace;padding:4px 8px;text-align:left;cursor:pointer;border-radius:3px;';
            btn.addEventListener('click', () => {
                this.fxToggles[key] = !this.fxToggles[key];
                this.applyFxToggles();
                refresh();
            });
            refresh();
            panel.appendChild(btn);
        }
        document.body.appendChild(panel);
        this.fxPanel = panel;
        this.applyFxToggles();
    }

    /** TEMP: применяет тумблеры к активным эффектам каждый кадр. */
    private applyFxToggles(): void {
        const t = this.fxToggles;
        if (!t['dof']!) {
            this.postFx.clearFocus();
        }
        // Аберрация и пыль управляются скоростью — гасим через флаг.
        this.postFx.aberration = t['aberration']! ? this.postFx.aberration : 0;
        this.dust.visible = t['dust']!;
        this.sceneManager.world.setWeatherEnabled(t['weather']!);
    }

    public dispose(): void {
        this.running = false;
        this.orbit.dispose();
        this.systemOrbit.dispose();
        this.controller.dispose();
        this.sceneManager.dispose();
        this.dust.dispose();
        this.postFx.dispose();
        this.renderer.dispose();
    }

    private readonly loop = (now: number): void => {
        if (!this.running) {
            return;
        }
        try {
            this.frame(now);
        } catch (err) {
            // Ошибка кадра не должна молча убивать RAF-цикл.
            this.running = false;
            const msg = err instanceof Error ? `${err.message} | ${err.stack ?? ''}` : String(err);
            if (this.dbgEl) this.dbgEl.textContent = 'LOOP-ERROR: ' + msg.slice(0, 500);
            else console.error('LOOP-ERROR:', err);
        }
    };

    private readonly frame = (now: number): void => {

        const dt = this.lastTime === 0 ? 0 : Math.min(0.1, (now - this.lastTime) / 1000);
        this.lastTime = now;
        this.frameNo++;

        // Владение камерой: карта вселенной -> новый CameraController
        // (ЛКМ-панорама, колесо-зум, СКМ-угол), карта галактики ->
        // орбитальная камера. Во время переходов позой владеет TransitionManager.
        const mode = this.sceneManager.getCurrentMode();
        const universeOwns = mode === 'universe-map'
            && !this.sceneManager.isTransitioning()
            && this.controller.isActive();
        const orbitOwns = mode === 'galaxy-systems'
            && !this.sceneManager.isTransitioning()
            && this.orbit.isActive();
        const systemOrbitOwns = mode === 'star-system'
            && !this.sceneManager.isTransitioning()
            && !this.sceneManager.isPlanetFocusActive()
            && this.systemOrbit.isActive();
        if (universeOwns) {
            this.controller.update(dt, this.camera);
            this.dust.intensity = 0;
            this.postFx.aberration = 0;
            // Имена галактик растут с приближением — слабее карты, с потолком.
            this.sceneManager.world.getUniverseRenderer().updateLabelScales(this.camera.position);
        } else if (orbitOwns) {
            this.orbit.update(dt, this.camera);
            this.dust.intensity = 0;
            this.postFx.aberration = 0;
            // Имена систем на карте галактики тянутся за зумом (слабее карты).
            this.sceneManager.world.getSystemsRenderer()?.updateLabelScales(this.camera.position);
        } else if (systemOrbitOwns) {
            this.systemOrbit.update(dt, this.camera);
            this.dust.intensity = 0;
            this.postFx.aberration = 0;
        } else {
            // Фокус планеты (дабл-клик в системе): поза удерживается каждый
            // кадр, т.к. планета движется по орбите. Orbit/controller не трогаем.
            if (this.sceneManager.getCurrentMode() === 'star-system' && this.sceneManager.isPlanetFocusActive()) {
                this.sceneManager.updatePlanetFocus(this.camera, dt);
            } else {
            // Скорость камеры управляет пылью и хроматической аберрацией
            // (если соответствующий фильтр не выключен в панели TEMP).
            const speed = this.controller.getSpeed();
            if (this.fxToggles['dust']!) this.dust.intensity = speed;
            if (this.fxToggles['aberration']!) {
                this.postFx.aberration = THREE.MathUtils.clamp((speed - 60) / 340, 0, 1);
            }
            }
        }
        // Пыль скорости обновляется ВСЕГДА — в том числе во время переходов:
        // фактическая скорость камеры (смена позиции за кадр) одинаково питает
        // перелёты вселенная→галактика и галактика→система. ЕДИНЫЙ механизм
        // частиц перелёта для обоих уровней.
        const travelSpeed = this.prevCamPosValid
            ? this.camera.position.distanceTo(this.prevCamPos) / Math.max(dt, 1e-4)
            : 0;
        if (!universeOwns && !orbitOwns && !systemOrbitOwns) {
            // В полёте пыль питается МАКСИМУМОМ из зум-скорости контроллера и
            // фактического перемещения камеры за кадр.
            if (this.fxToggles['dust']!) {
                this.dust.intensity = Math.max(this.dust.intensity, THREE.MathUtils.clamp((travelSpeed - 12) * 2.2, 0, 400));
            }
        }
        this.prevCamPos.copy(this.camera.position);
        this.prevCamPosValid = true;
        this.dust.update(dt, this.camera.position);

        this.sceneManager.update(this.camera, dt).then((count) => {
            // Владение камерой пересчитывается КАЖДЫЙ кадр по СВЕЖЕМУ режиму:
            // переменная mode захвачена в начале кадра и устаревает ровно в тот
            // кадр, когда переход завершается (раньше из-за этого orbit делал
            // detach вместо attach и управление никогда не включалось).
            if (!this.sceneManager.isTransitioning()) {
                const liveMode = this.sceneManager.getCurrentMode();
                if (liveMode === 'galaxy-systems') {
                    const g = this.sceneManager.getActiveGalaxy();
                    if (g) {
                        // Вход в карту галактики ВСЕГДА канонический обзор
                        // (attach сбрасывает к 63°/R*2.4 после detach перехода):
                        // память камеры между посещениями отключена (юзер).
                        this.orbit.attach(g, this.renderer.domElement);
                    }
                } else if (liveMode === 'star-system' || liveMode === 'system-galaxies') {
                    if (!this.sceneManager.isPlanetFocusActive()) {
                        const center = this.sceneManager.getActiveSystemCenter();
                        if (center) {
                            // Центр — мировая позиция звезды; дистанция и радиус —
                            // единые формулы с перелётом enterSystem.
                            this.systemOrbit.attach(
                                center,
                                this.sceneManager.getActiveSystemRadius(),
                                this.sceneManager.getActiveSystemDistance(),
                                this.renderer.domElement,
                            );
                        }
                    } else {
                        // Фокус планеты: орбитальная камера не должна владеть
                        // вводом — позой владеет updatePlanetFocus каждый кадр.
                        this.systemOrbit.detach();
                    }
                } else {
                    this.systemOrbit.detach();
                }
                if (liveMode !== 'galaxy-systems') this.orbit.detach();
                // Ввод контроллера вселенной активен ТОЛЬКО в её режиме:
                // иначе колесо/драг на карте галактики копили бы зум и
                // панораму вселенной (источник рывков при возврате).
                this.controller.setEnabled(liveMode === 'universe-map');
            } else {
                this.orbit.detach();
                this.systemOrbit.detach();
                this.controller.setEnabled(false);
            }
            // Ориентацию камеры менял переход (не пользователь) —
            // контроллер карты вселенной перепривязывается к позе перехода.
            if (this.wasTransitioning && !this.sceneManager.isTransitioning()) {
                if (this.sceneManager.getCurrentMode() === 'universe-map') {
                    this.controller.attach(this.renderer.domElement);
                    // Угол карты вселенной не переживает уход (юзер):
                    // плавный возврат к базе 63° в update().
                    this.controller.resetTilt();
                }
                this.sceneManager.applyDepthOfField(this.camera);
                this.updateHud();
            }
            this.wasTransitioning = this.sceneManager.isTransitioning();

            if (this.dbgEl) {
                const info = this.renderer.info.render;
                const pos = this.camera.position;
                let sprites = 0;
                let visible = 0;
                const ops = new Set<string>();
                this.sceneManager.getScene().traverse((o) => {
                    if ((o as THREE.Sprite).isSprite) {
                        sprites++;
                        if (o.visible) visible++;
                        const m = (o as THREE.Sprite).material as THREE.SpriteMaterial;
                        ops.add(`${m.opacity.toFixed(2)}${m.map ? '' : ':NO-MAP'}`);
                    }
                });
                let inFrustum = 0;
                const pv = new THREE.Vector3();
                for (const m of this.sceneManager.world.getUniverseRenderer().getMeshes()) {
                    pv.copy(m.position).project(this.camera);
                    if (pv.x >= -1 && pv.x <= 1 && pv.y >= -1 && pv.y <= 1 && pv.z < 1) inFrustum++;
                }
                this.dbgEl.textContent =
                    `sceneChildren=${this.sceneManager.getScene().children.length}` +
                    `
galaxies=${count} drawCalls=${info.calls} inFrame=${inFrustum}` +
                    `
sprites=${sprites} visible=${visible}` +
                    `\nopacity=[${Array.from(ops).slice(0, 4).join(' | ')}]` +
                    ` px[${this.pxSamples}]` +
                    `cam=(${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}, ${pos.z.toFixed(0)})` + ` yaw=${THREE.MathUtils.radToDeg(new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'ZXY').z).toFixed(0)} pitch=${THREE.MathUtils.radToDeg(new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'ZXY').x).toFixed(0)}` +
                    // ДИСТАНЦИЯ ДО СИСТЕМЫ: юниты и кратность радиуса (xR) —
                    // юзер смотрит и говорит, где поставить предел отдаления.
                    (() => {
                        if (mode === 'star-system') {
                            const d = this.systemOrbit.getFocus().distance;
                            const r = this.sceneManager.getActiveSystemRadius() ?? 0;
                            return `\ndist=${d.toFixed(0)} (${(r > 0 ? d / r : 0).toFixed(1)}xR)`;
                        }
                        return '';
                    })();
            }

            const crumb = this.sceneManager.getBreadcrumb();
            if (count !== this.count || crumb !== this.lastCrumb) {
                this.count = count;
                this.lastCrumb = crumb;
                this.updateHud();
            }
        }).catch((err: unknown) => {
            console.error('Scene update failed:', err);
            if (this.dbgEl) {
                const msg = err instanceof Error ? `${err.message} | ${err.stack ?? ''}` : String(err);
                this.dbgEl.textContent = 'UPDATE-ERROR: ' + msg.slice(0, 400);
            }
        });

        // Счётчик кадра сбрасывается ПЕРЕД рендером: оверлей читает его
        // в микротаске после рендера, но до следующего кадра.
        this.renderer.info.reset();
        // Мастер-пост НЕ выключается: его интенсивность плавно кроссфейдится
        // между уровнями (~0.6 сек). Вселенная 0.7, карта галактики 0.25,
        // система — почти ноль (0.0055), планета 0.02.
        const targetPost = this.fxToggles['postMaster']!
            ? (mode === 'universe-map' ? 0.7 : mode === 'galaxy-systems' ? 0.25 : mode === 'star-system' ? 0.0055 : 0.02)
            : 0;
        this.postIntensity += (targetPost - this.postIntensity) * Math.min(1, dt * 3.2);
        this.postFx.enabled = this.postIntensity > 0.005;
        this.postFx.bloomStrength = 0.55 * this.postIntensity * (this.fxToggles['bloom']! ? 1 : 0);
        this.postFx.render(this.sceneManager.getScene(), this.camera);
        // Пиксельная телеметрия канваса: РАЗ В ~0.5 сек (каждый 30-й кадр).
        // readPixels каждый кадр синхронизирует GPU и дёргает рендер —
        // это был источник статтеров («экран дёргается»).
        if (this.dbgEl && this.frameNo % 30 === 0) {
            const gl = this.renderer.getContext();
            const bw = gl.drawingBufferWidth;
            const bh = gl.drawingBufferHeight;
            const cols = 16;
            const rows = 9;
            const block = gl.readPixels.bind(gl) as typeof gl.readPixels;
            const buf = new Uint8Array(cols * rows * 4);
            // Читаем весь кадр уменьшенно: по одному пикселю на ячейку сетки.
            let sum = 0;
            let maxL = 0;
            let lost = gl.isContextLost();
            for (let ry = 0; ry < rows && !lost; ry++) {
                for (let cx = 0; cx < cols; cx++) {
                    block(
                        Math.floor((bw * (cx + 0.5)) / cols),
                        Math.floor((bh * (ry + 0.5)) / rows),
                        1, 1, gl.RGBA, gl.UNSIGNED_BYTE,
                        buf.subarray((ry * cols + cx) * 4),
                    );
                    const o = (ry * cols + cx) * 4;
                    const lum = (buf[o]! + buf[o + 1]! + buf[o + 2]!) / 3;
                    sum += lum;
                    if (lum > maxL) maxL = lum;
                }
            }
            this.pxSamples = lost
                ? 'CTX-LOST'
                : `buf=${bw}x${bh} avg=${(sum / (cols * rows)).toFixed(1)} max=${maxL.toFixed(0)}`;
        }
        requestAnimationFrame(this.loop);
    };

    private bindEvents(): void {
        window.addEventListener('resize', this.onResize);
        this.renderer.domElement.addEventListener('click', this.onClick);
        // ДВОЙНОЙ КЛИК = вход во внутренний слой (везде: галактика, система,
        // вложенная галактика). Первый клик выбирает, второй — летит.
        this.renderer.domElement.addEventListener('dblclick', this.onDblClick);
        document.getElementById('enterButton')?.addEventListener('click', this.onEnter);
        document.getElementById('backButton')?.addEventListener('click', this.onBack);
        document.getElementById('breadcrumbs')?.addEventListener('click', this.onBreadcrumbClick);
    }

    /**
     * Клик по хлебной крошке: возврат на уровень-предок (кроме текущего —
     * он не ссылка). Логика зеркальна onBack, но с выбором глубины.
     */
    private readonly onBreadcrumbClick = (event: MouseEvent): void => {
        const target = event.target as HTMLElement | null;
        const crumb = target?.closest<HTMLElement>('[data-kind]');
        if (!crumb || this.sceneManager.isTransitioning()) return;

        const mode = this.sceneManager.getCurrentMode();
        const kind = crumb.dataset.kind;
        if (!kind || kind === mode) return; // текущий уровень не кликается

        if (mode === 'star-system' && kind === 'galaxy') {
            this.sceneManager.returnToGalaxy(this.camera, this.orbit.getFocus());
        } else if (mode === 'galaxy-systems' && kind === 'universe') {
            const focus = this.controller.getFocus();
            this.sceneManager.returnToUniverseMap(this.camera, focus);
        }
        this.clearSelection();
        this.updateHud();
    }

    private readonly onResize = (): void => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.postFx.setSize(window.innerWidth, window.innerHeight);
    };

    private readonly onClick = (event: MouseEvent): void => {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.pointer, this.camera);

        const meshes = this.sceneManager.getPickableObjects();
        let hits = this.raycaster.intersectObjects(meshes, false);

        // Мелкие цели (сферы систем/планет 0.4-0.7 юнита) почти невозможно
        // накрыть курсором: если точное попадание мимо — берём объект,
        // ближайший к ЛУЧУ в пределах допуска. Радиус клика 72px (юзер
        // попросил ещё вдвое от 36) — невидимая зона захвата вокруг цели.
        if (hits.length === 0 && meshes.length > 0) {
            const ray = this.raycaster.ray;
            let best: THREE.Object3D | null = null;
            let bestDist = Infinity;
            const tolerancePx = 72;
            // Допуск в мировых юнитах на дистанции объекта: px * worldPerPixel.
            for (const mesh of meshes) {
                const distAlongRay = ray.distanceToPoint(mesh.getWorldPosition(new THREE.Vector3()));
                if (distAlongRay < 0) continue;
                const closest = ray.distanceSqToPoint(mesh.getWorldPosition(new THREE.Vector3()));
                const worldPerPx = 2 * Math.tan((this.camera.fov * Math.PI) / 360) * distAlongRay / this.renderer.domElement.clientHeight;
                const tolWorld = tolerancePx * worldPerPx;
                if (closest <= tolWorld * tolWorld && closest < bestDist) {
                    bestDist = closest;
                    best = mesh;
                }
            }
            if (best) {
                hits = [{ object: best, distance: 0, point: best.getWorldPosition(new THREE.Vector3()) } as unknown as THREE.Intersection];
            }
        }

        if (hits.length === 0) {
            this.clearSelection();
            // Пустой клик в режиме фокуса планеты = плавный выход из крупного плана.
            if (this.sceneManager.getCurrentMode() === 'star-system' && this.sceneManager.isPlanetFocusActive()) {
                this.sceneManager.exitPlanetFocus(this.camera);
            }
            return;
        }

        const picked = this.sceneManager.pickObject(hits[0]!.object);

        if (picked) {
            this.select(picked);
        }
    };

    /**
     * ДВОЙНОЙ КЛИК: тот же пикинг, что у одиночного, но с немедленным
     * входом во внутренний слой. Одиночный клик остаётся только выбором.
     */
    private readonly onDblClick = (event: MouseEvent): void => {
        this.onClick(event);
        if (!this.selected || this.sceneManager.isTransitioning()) return;
        this.onEnter();
    };

    private readonly onEnter = (): void => {
        if (!this.selected || this.sceneManager.isTransitioning()) {
            return;
        }

        const mode = this.sceneManager.getCurrentMode();

        if (mode === 'universe-map' && this.isGalaxy(this.selected)) {
            void this.sceneManager.enterGalaxy(this.selected, this.camera);
            this.clearSelection();
            return;
        }

        if (mode === 'galaxy-systems' && this.isSystem(this.selected)) {
            void this.sceneManager.enterSystem(this.selected, this.camera);
            this.clearSelection();
            return;
        }

        // ФРАКТАЛ: галактика, стримящаяся внутри системы.
        if ((mode === 'system-galaxies' || mode === 'star-system') &&
            this.isGalaxy(this.selected) && this.sceneManager.hasInnerMap()) {
            void this.sceneManager.enterSystemGalaxy(this.selected, this.camera);
            this.clearSelection();
            return;
        }

        if (mode === 'star-system' && this.isPlanet(this.selected)) {
            // ДВОЙНОЙ КЛИК по планете в системе = крупный боковой план
            // (камера приближается сбоку, планета на весь экран), НЕ вход
            // на поверхность.
            void this.sceneManager.focusPlanet(this.selected, this.camera);
            this.clearSelection();
        }
    };

    private readonly onBack = (): void => {
        if (this.sceneManager.isTransitioning()) return;

        const mode = this.sceneManager.getCurrentMode();

        // Если камера в фокусе планеты (дабл-клик), возврат = ПЛАВНЫЙ выход
        // из крупного плана обратно в орбитальную карту системы (без телепорта).
        if (mode === 'star-system' && this.sceneManager.isPlanetFocusActive()) {
            this.sceneManager.exitPlanetFocus(this.camera);
            this.updateHud();
            this.clearSelection();
            return;
        }

        if (mode === 'planet-surface') {
            // Возврат в АКТУАЛЬНЫЙ фокус орбиты системы (единая схема).
            this.sceneManager.returnToSystem(this.camera, this.systemOrbit.getFocus());
        } else if (mode === 'star-system') {
            // Возврат в АКТУАЛЬНЫЙ фокус орбиты галактики (панорама/зум
            // сохраняются), а не в снапшот момента входа.
            this.sceneManager.returnToGalaxy(this.camera, this.orbit.getFocus());
        } else if (mode === 'galaxy-systems') {
            // Передаём АКТУАЛЬНЫЙ фокус карты вселенной: возврат летит туда,
            // откуда пользователь ушёл (с учётом панорам), а не в снапшот.
            const focus = this.controller.getFocus();
            this.sceneManager.returnToUniverseMap(this.camera, focus);
        }

        this.clearSelection();
        this.updateHud();
    };

    private select(obj: Galaxy | StarSystem | Planet): void {
        this.selected = obj;
        const el = document.getElementById('selected');
        if (!el) {
            return;
        }
        el.style.display = 'block';
        const nameEl = document.getElementById('selectedName');
        const typeEl = document.getElementById('selectedType');

        if (this.isGalaxy(obj)) {
            if (nameEl) {
                nameEl.textContent = obj.name;
            }
            if (typeEl) {
                typeEl.textContent = obj.type;
            }
        } else if (this.isSystem(obj)) {
            if (nameEl) {
                nameEl.textContent = obj.name;
            }
            if (typeEl) {
                typeEl.textContent = obj.spectralType + '-class star';
            }
        }
    }

    private clearSelection(): void {
        this.selected = null;
        const el = document.getElementById('selected');
        if (el) {
            el.style.display = 'none';
        }
    }

    private updateHud(): void {
        const seedEl = document.getElementById('seedValue');
        const countEl = document.getElementById('countValue');
        const modeEl = document.getElementById('modeValue');
        const crumbEl = document.getElementById('crumbValue');
        const backBtn = document.getElementById('backButton');

        if (seedEl) {
            seedEl.textContent = String(this.deps.universeSeed);
        }

        const mode = this.sceneManager.getCurrentMode();

        const modeLabels: Record<SceneMode, string> = {
            'universe-map': 'Карта вселенной',
            'galaxy-systems': 'Карта галактики',
            'star-system': 'Звёздная система',
            'system-galaxies': 'Галактики системы',
            'planet-surface': 'Поверхность планеты',
        };

        if (modeEl) {
            modeEl.textContent = modeLabels[mode];
        }

        if (crumbEl) {
            crumbEl.textContent = this.sceneManager.getBreadcrumb();
        }

        if (countEl) {
            const count = mode === 'universe-map'
                ? this.sceneManager.getGalaxyCount()
                : mode === 'galaxy-systems'
                    ? this.sceneManager.getSystemCount()
                    : mode === 'star-system'
                        ? this.sceneManager.getPlanetCount()
                        : this.sceneManager.getBuildingCount();
            countEl.textContent = String(count);
        }

        if (backBtn) {
            // Кнопка «НАЗАД» вне панели выбора и видна на ВСЕХ уровнях,
            // кроме карты вселенной (туда возвращаться нечего).
            backBtn.style.display = mode === 'universe-map' ? 'none' : 'block';
        }

        // --- Хлебные крошки: цепочка локаций, предки кликабельны.
        const crumbsEl = document.getElementById('breadcrumbs');
        if (crumbsEl) {
            const path = this.sceneManager.getLocationPath();
            const kindLabels: Record<string, string> = {
                universe: 'Вселенная',
                galaxy: 'Галактика',
                system: 'Система',
                planet: 'Планета',
            };
            crumbsEl.textContent = '';
            path.forEach((loc, i) => {
                const isLast = i === path.length - 1;
                const name = loc.kind === 'universe'
                    ? kindLabels['universe']!
                    : 'name' in loc
                        ? loc.name
                        : `Планета ${'index' in loc ? loc.index + 1 : '?'}`;
                if (i > 0) {
                    const sep = document.createElement('span');
                    sep.className = 'crumb-sep';
                    sep.textContent = '›';
                    crumbsEl.appendChild(sep);
                }
                const el = document.createElement(isLast ? 'span' : 'button');
                el.className = isLast ? 'crumb crumb-current' : 'crumb';
                if (!isLast) {
                    (el as HTMLButtonElement).type = 'button';
                    el.dataset.kind = loc.kind;
                    el.title = `Вернуться: ${kindLabels[loc.kind] ?? loc.kind}`;
                }
                el.textContent = isLast ? `${name}` : name;
                crumbsEl.appendChild(el);
            });
        }
    }

    private isGalaxy(obj: Galaxy | StarSystem | Planet): obj is Galaxy {
        return 'type' in obj && (obj.type === 'spiral' || obj.type === 'elliptical' || obj.type === 'irregular');
    }

    private isSystem(obj: Galaxy | StarSystem | Planet): obj is StarSystem {
        return 'spectralType' in obj;
    }

    private isPlanet(obj: Galaxy | StarSystem | Planet): obj is Planet {
        return 'radiusKm' in obj;
    }

}
