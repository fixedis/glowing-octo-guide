// client/src/scene/scene-manager.ts
import * as THREE from 'three';
import type { UniverseClient } from '../api/universe-client.js';
import { LocationStack, type Location } from '../core/locations.js';
import type { Galaxy, Planet, StarSystem } from '../core/types.js';
import type { Building } from '../core/types.js';
import { TransitionFx } from './fx/transition-fx.js';
import { GalaxyMapScene } from './galaxy-map-scene.js';
import { findLandDirection, terrainHeight } from './surface-noise.js';
import { TransitionManager } from './transition-manager.js';
import { WorldScene } from './world-scene.js';

export type SceneMode =
    | 'universe-map'
    | 'galaxy-systems'
    | 'star-system'
    | 'system-galaxies'
    | 'planet-surface';

export interface SceneCallbacks {
    readonly onGalaxySelected?: (galaxy: Galaxy) => void;
    readonly onSystemSelected?: (galaxy: Galaxy, system: StarSystem) => void;
}

interface CameraPose {
    readonly position: THREE.Vector3;
    readonly quaternion: THREE.Quaternion;
}

// Домашняя поза карты вселенной: над «полом» XZ, возвышение 63° (как у
// орбитальных камер), дистанция 4400 от фокуса (500, 0, 500).
const UNIVERSE_HOME = new THREE.Vector3(500, 3920, -1500);

/**
 * Литая сцена: уровни = слои одной WorldScene, переходы = полёт камеры + fade.
 */
export class SceneManager {
    readonly world = new WorldScene();
    private readonly locations: LocationStack;
    private readonly callbacks: SceneCallbacks;
    private readonly transition = new TransitionManager();
    private readonly fx = new TransitionFx();
    /** Пост-обработка пробрасывается приложением; null = DoF выключен. */
    private postFx: { setFocus(camera: THREE.PerspectiveCamera, target: THREE.Vector3, range: number, strength?: number): void; clearFocus(): void } | null = null;
    private readonly universeMap: GalaxyMapScene;

    private mode: SceneMode = 'universe-map';
    private busy = false;
    /** Одноразовый флаг вспышки прорыва сквозь облака. */
    private breakthroughDone = false;
    /** Объёмные облака задеплоены на этом перелёте. */
    private cloudsDeployed = false;

    private activeGalaxy: Galaxy | null = null;
    private activeSystem: StarSystem | null = null;
    /** Активная планета (на поверхности которой находимся). */
    private activePlanet: Planet | null = null;
    /** Габарит сцены активной системы (юниты) — фиксируется при enterSystem. */
    private activeSystemRadius = 60;

    /**
     * ФРАКТАЛ: карта галактик внутри активной системы. Стримится тем же
     * GalaxyMapScene, но seedSource отдаёт сид родительской системы.
     */
    private systemGalaxyMap: GalaxyMapScene | null = null;
    /** Сид системы, чья вложенная карта сейчас активна. */
    private innerSeed: number | null = null;

    private universePose: CameraPose | null = null;
    /** Эталонный размах перелёта В→Г (соотносится с дальностью всех перелётов). */
    private static readonly REFERENCE_SPAN = 5798.4;
    private systemPose: CameraPose | null = null;

    public constructor(
        private readonly universeSeed: number,
        private readonly client: UniverseClient,
        callbacks: SceneCallbacks,
    ) {
        this.callbacks = callbacks;
        this.locations = new LocationStack(universeSeed);
        // GalaxyMapScene наполняет ОБЩИЙ слой вселенной литой сцены чанками.
        this.universeMap = new GalaxyMapScene(
            universeSeed,
            client,
            this.world.seedGraph,
            this.world.getUniverseRenderer(),
        );
    }

    // --- Публичное состояние ---
    public getScene(): THREE.Scene { return this.world.scene; }
    public getCurrentMode(): SceneMode { return this.mode; }
    public getBreadcrumb(): string { return this.locations.breadcrumb(); }
    public getCurrentLocation(): Location { return this.locations.current; }
    /** Полный путь локаций — для интерактивных хлебных крошек. */
    public getLocationPath(): readonly Location[] { return this.locations.path(); }
    public getGalaxyCount(): number { return this.universeMap.getGalaxyCount(); }
    public getSystemCount(): number {
        const r = this.world.getSystemsRenderer();
        return this.mode === 'galaxy-systems' && r ? r.getMeshes().length : 0;
    }
    public getPlanetCount(): number {
        const r = this.world.getSystemRenderer();
        return this.mode === 'star-system' && r ? r.getMeshes().length : 0;
    }
    public getBuildingCount(): number { return 0; }
    public isTransitioning(): boolean {
        return this.transition.isTransitioning() || this.busy;
    }

    /** Галактика, в которую выполнен вход (для орбитальной камеры приложения). */
    public getActiveGalaxy(): Galaxy | null {
        return this.activeGalaxy;
    }

    /** Система, в которую выполнен вход. */
    public getActiveSystem(): StarSystem | null {
        return this.activeSystem;
    }

    /** Мировая позиция звезды активной системы (центр орбитальной камеры). */
    public getActiveSystemCenter(): THREE.Vector3 | null {
        const r = this.world.getSystemRenderer();
        return r ? r.getStarWorldPosition() : null;
    }

    /** Радиус активной системы (запоминается при enterSystem). */
    public getActiveSystemRadius(): number {
        return this.activeSystemRadius ?? 60;
    }

    /** Дистанция стыка перелёта — ОБЗОРНАЯ поза эталона В→Г (radius*2.4). */
    public getActiveSystemDistance(): number {
        return this.getActiveSystemRadius() * 2.4;
    }

    public getPickableObjects(): THREE.Object3D[] {
        if (this.isTransitioning()) return [];
        if (this.mode === 'star-system') {
            const meshes = this.world.getSystemRenderer()?.getMeshes() ?? [];
            // ФРАКТАЛ: узлы вложенной карты кликабельны прямо из системы.
            return [...meshes, ...(this.world.getInnerMapRenderer()?.getMeshes() ?? [])];
        }
        if (this.mode === 'galaxy-systems') return this.world.getSystemsRenderer()?.getMeshes() ?? [];
        if (this.mode === 'universe-map') return this.world.getUniverseRenderer().getMeshes();
        if (this.mode === 'system-galaxies') {
            return this.world.getInnerMapRenderer()?.getMeshes() ?? [];
        }
        return [];
    }

    public pickObject(object: THREE.Object3D): Galaxy | StarSystem | Planet | null {
        if (this.isTransitioning()) return null;
        if (this.mode === 'star-system') {
            // Сначала узел вложенной карты, затем (будущие) планеты.
            const inner = this.world.getInnerMapRenderer()?.pickGalaxy(object);
            if (inner) return inner;
            return this.world.getSystemRenderer()?.pickPlanet(object) ?? null;
        }
        if (this.mode === 'galaxy-systems') return this.world.getSystemsRenderer()?.pickSystem(object) ?? null;
        if (this.mode === 'universe-map') return this.world.getUniverseRenderer().pickGalaxy(object) ?? null;
        if (this.mode === 'system-galaxies') {
            return this.world.getInnerMapRenderer()?.pickGalaxy(object) ?? null;
        }
        return null;
    }

    public async update(camera: THREE.Camera, dt: number): Promise<number> {
        this.transition.update(dt, camera as THREE.PerspectiveCamera);
        // Сопровождение камеры УДАЛЕНО: позой в режиме карты галактики
        // единолично владеет GalaxyOrbitCamera (приложение) — ЛКМ вращение,
        // колесо зум, ПКМ/WASD панорама. Ракурс сохраняется между кадрами.
        // Позиция камеры для эффектов, привязанных к ней (погода).
        this.world.setCameraPosition(camera.position);
        // Позиция камеры для засветки фона вокруг диска солнца (star-system).
        this.world.setSystemCamera(camera);
        this.world.update(dt);
        if (this.isTransitioning()) return 0;
        if (this.mode === 'star-system') {
            this.updateGalaxyVisibilityByZoom(camera as THREE.PerspectiveCamera);
        }
        if (this.mode === 'universe-map') return this.universeMap.update(camera);
        // ФРАКТАЛ: вложенная карта стримится и в системе, и в её режиме карт.
        if ((this.mode === 'star-system' || this.mode === 'system-galaxies') &&
            this.systemGalaxyMap && this.innerSeed !== null) {
            return this.systemGalaxyMap.update(camera);
        }
        return 0;
    }

    /**
     * Контекстная видимость галактики на карте системы: на стандартном зуме
     * космос ЧИСТЫЙ (галактика погашена), но при сильном ОТДАЛЕНИИ родная
     * галактика плавно ПРОСТУПАЕТ вокруг системы (ты «выглянул» за её пределы).
     * Порог: от 3× обзорной дистанции начинается проявление, к 12× оно полное.
     */
    private updateGalaxyVisibilityByZoom(camera: THREE.PerspectiveCamera): void {
        const sysRenderer = this.world.getSystemRenderer();
        const center = this.getActiveSystemCenter();
        if (!sysRenderer || !center) return;
        const dist = camera.position.distanceTo(center);
        // ЕДИНАЯ ОСЬ ЗУМА = РАДИУСЫ СИСТЕМЫ (фикс: пороги от galR стреляли
        // на дистанции прилёта, т.к. sysR*2.4 бывает больше galR*0.9):
        //   СОЛНЦЕ: ярко до z=4.2, к лимиту отдаления меркнет лишь ДО ПОЛОВИНЫ
        //   (юзер: «при отдалении солнце пропадает» — исчезать оно не должно,
        //   остаётся светящейся точкой на фоне проступающей галактики);
        //   ФОН ГАЛАКТИКИ: ноль до z=3.2, полный к z=6.5 (система сжалась).
        // Каналы перекрываются — солнце уступает сцену проступающей галактике.
        const sysR = Math.max(1, this.getActiveSystemRadius());
        const z = dist / sysR;
        const sT = THREE.MathUtils.clamp((z - 4.2) / (9.5 - 4.2), 0, 1);
        this.world.setSunFade(1 - (sT * sT * (3 - 2 * sT)) * 0.55);
        const gT = THREE.MathUtils.clamp((z - 3.2) / (6.5 - 3.2), 0, 1);
        this.world.setGalaxyBackdropOpacity(gT * gT * (3 - 2 * gT));
    }

    // --- DoF ---
    public setPostFx(fx: NonNullable<typeof this.postFx>): void {
        this.postFx = fx;
    }

    /**
     * ЕДИНАЯ СКОРОСТЬ ПЕРЕЛЁТОВ (В→Г, Г→С, вложенные): длительность
     * пропорциональна дистанции, зажата в разумные рамки. Короткий хоп
     * не «ползёт», длинный не телепорт.
     */
    private flyDuration(start: THREE.Vector3, end: THREE.Vector3): number {
        const d = start.distanceTo(end);
        // Знаменатель подобран так, чтобы пик скорости easeInOutCubic (×3 от
        // средней) не «выстреливал» мимо объектов карты: 3*d/3400 <= ~5000 юн/с.
        return THREE.MathUtils.clamp(d / 3400, 1.6, 4.5);
    }

    private capturePose(camera: THREE.PerspectiveCamera): CameraPose {
        return { position: camera.position.clone(), quaternion: camera.quaternion.clone() };
    }

    /**
     * Настраивает DoF пост-обработки под текущий уровень:
     * фокус на центре активности, фон уходит в мягкое боке.
     * postFx пробрасывается приложением (может отсутствовать — эффект просто выключен).
     */
    public applyDepthOfField(camera: THREE.PerspectiveCamera): void {
        const fx = this.postFx;
        if (!fx) return;
        // ОТКЛЮЧЕНО по решению пользователя: размытие глубины «троило» всю
        // сцену (многокопийный blur при любом сбое фокуса). Оставлены только
        // bloom и виньетка. Метод сохранён как точка включения на будущее.
        fx.clearFocus();
    }

    // ===== Переход: клик по галактике =====
    public async enterGalaxy(galaxy: Galaxy, camera: THREE.PerspectiveCamera): Promise<void> {
        if (this.mode !== 'universe-map' || this.isTransitioning()) return;
        this.busy = true;
        try {
            this.universePose = this.capturePose(camera);
            const data = await this.client.getStarSystems(galaxy.seed, galaxy.radius);
            const start = camera.position.clone();
            // Конец: над диском галактики, возвышение 63° — ТА ЖЕ ПОЗА,
            // которую принимает орбитальная камера (pitchBase, сектор +Z):
            // перелёт заканчивается ровно там, где начинается управление.
            // Дистанция R*2.4 — галактика ЦЕЛИКОМ в кадре (единая формула
            // с attach() орбитальной камеры).
            const elevAngle = THREE.MathUtils.degToRad(63);
            const dist = galaxy.radius * 2.4;
            const end = new THREE.Vector3(
                galaxy.x,
                galaxy.y + Math.sin(elevAngle) * dist,
                galaxy.z + Math.cos(elevAngle) * dist,
            );
            // Фон Аттрактора и вселенная гаснут быстро; пыль рукавов проявляется
            // позже спрайта (узел растёт из точки в диск).
            this.transition.start(
                {
                    duration: this.flyDuration(start, end),
                    start,
                    end,
                    lookAt: new THREE.Vector3(galaxy.x, galaxy.y, galaxy.z),
                    fovFrom: camera.fov,
                    fovTo: 55,
                    onProgress: (t) => {
                        this.world.setAttractorOpacity(1 - THREE.MathUtils.clamp(t / 0.45, 0, 1));
                        this.world.setUniverseOpacity(1 - THREE.MathUtils.clamp(t / 0.55, 0, 1));
                        // Фон-галактика сначала как точка/спрайт, затем детали.
                        this.world.setGalaxyBackdropOpacity(THREE.MathUtils.clamp((t - 0.35) / 0.65, 0, 1));
                        this.world.setSystemsMapOpacity(THREE.MathUtils.clamp((t - 0.55) / 0.45, 0, 1));
                    },
                },
                () => {
                    this.world.showGalaxy(galaxy, data.data.systems, data.data.routes);
                    this.world.setGalaxyBackdropOpacity(0);
                    this.world.setSystemsMapOpacity(0);
                },
                () => {
                    this.busy = false;
                    this.activeGalaxy = galaxy;
                    this.mode = 'galaxy-systems';
                    this.locations.push({ kind: 'galaxy', seed: galaxy.seed, name: galaxy.name, type: galaxy.type });
                    this.callbacks.onGalaxySelected?.(galaxy);
                },
            );
        } catch (err) {
            this.busy = false;
            console.error('Failed to enter galaxy:', err);
        }
    }

    // ===== Переход: клик по системе =====
    // ЕДИНЫЙ СПУСК (профиль-эталон как в enterGalaxy): камера идёт от текущей
    // позиции к точке системы МОНОТОННО, без провала под финишную дистанцию —
    // лог-профиль 1/r даёт плавное торможение и рост объекта с первого кадра.
    // Финал ровно в позе орбитальной камеры (возвышение 63°, R*2.2) — стык
    // бесшовный. Частицы перелёта — единый механизм пыли скорости приложения
    // (фактическая скорость камеры).
    public async enterSystem(system: StarSystem, camera: THREE.PerspectiveCamera): Promise<void> {
        if (this.mode !== 'galaxy-systems' || this.isTransitioning() || !this.activeGalaxy) return;
        this.busy = true;
        try {
            const data = await this.client.getPlanets(system.seed, system.planetCount);

            const galaxyLayer = this.world.getGalaxyLayer();
            const galaxyCenter = galaxyLayer?.position.clone() ?? new THREE.Vector3();
            const starPos =
                this.world.findSystemsMapPosition(system.seed) ?? galaxyCenter.clone();
            const start = camera.position.clone();
            // СООТНОШЕНИЕ ДАЛЬНОСТЕЙ (эталон В→Г): размах перелёта Г→С равен
            // размаху эталона В→Г (REFERENCE_SPAN = 5798.4). Система выносится
            // вдоль луча взгляда «камера → звезда», чтобы длина полёта
            // |старт → деплой| равнялась эталону при любой точке клика.
            const toStar = starPos.clone().sub(start);
            const rayDir = toStar.clone().normalize();
            const carry = Math.max(
                0,
                SceneManager.REFERENCE_SPAN - start.distanceTo(galaxyCenter),
            );
            const systemScenePos = starPos.clone().addScaledVector(rayDir, carry);
            // Масштаб сцены системы: охватывает самую внешнюю орбиту.
            // Формула синхронна с SystemRenderer.buildPlanets:
            //   baseOrbit = starR + 6; gap = max(7, starR*1.6);
            //   внешняя орбита = baseOrbit + (n-1)*gap.
            const starSizes: Record<string, number> = { O: 6, B: 5, A: 4.2, F: 3.6, G: 3.2, K: 2.8, M: 2.4 };
            const starR = starSizes[system.spectralType] ?? 3;
            const n = Math.max(1, data.data.planets.length);
            const gap = Math.max(7, starR * 1.6);
            let sysRadius = starR + 6 + (n - 1) * gap + 4;
            this.activeSystemRadius = sysRadius;

            // --- Геометрия спуска: финиш — поза орбитальной камеры
            // (возвышение 63°, R*2.2 над точкой клика). Полёт ПО ПРЯМОЙ,
            // ТРЕКИНГ-ЦЕЛЬ = ТОЧКА КЛИКА: при подлёте центр экрана (камера),
            // иконка звезды и система выстраиваются на одной линии — камера
            // летит ровно по этой линии, как в эталоне В→Г.
            const elevAngle = THREE.MathUtils.degToRad(63);
            // ФИНИШ = ОБЗОРНАЯ ПОЗА ЭТАЛОНА В→Г: возвышение 63°, R*2.4 над
            // точкой системы — та же формула, что в enterGalaxy для галактики.
            const sysDistance = sysRadius * 2.4;
            const end = new THREE.Vector3(
                systemScenePos.x,
                systemScenePos.y + Math.sin(elevAngle) * sysDistance,
                systemScenePos.z + Math.cos(elevAngle) * sysDistance,
            );

            // ЛИНИЯ ПОЛЁТА = ЛИНЕЙКА: без контрольной точки переход
            // интерполируется ПО ПРЯМОЙ от старта к финишу. ТРЕКИНГ-ЦЕЛЬ =
            // деплой: точка клика не сходит с курса весь полёт.
            this.transition.start(
                {
                    duration: this.flyDuration(start, end),
                    start,
                    end,
                    trackLookAt: systemScenePos.clone(),
                    fovFrom: camera.fov,
                    fovTo: 55,
                    // Фазы привязаны к РЕАЛЬНОМУ времени (без easing):
                    // «мгновенное» гашение сетки не должно растягиваться
                    // медленным стартом камеры.
                    progressRaw: true,
                    onProgress: (t) => {
                        // ФАЗЫ: сетка систем исчезает ПОЧТИ МГНОВЕННО
                        // (t/0.10, плавный спад за первые ~0.2с полёта);
                        // фон-галактика (t-0.15)/0.55; система с (t-0.25)/0.75.
                        this.world.setSystemsMapOpacity(1 - THREE.MathUtils.clamp(t / 0.10, 0, 1));
                        this.world.setGalaxyBackdropOpacity(1 - THREE.MathUtils.clamp((t - 0.15) / 0.55, 0, 1));
                        this.world.setSystemOpacity(THREE.MathUtils.clamp((t - 0.25) / 0.75, 0, 1));
                    },
                },
                () => {
                    this.world.showSystemAt(system, system.spectralType, system.seed, systemScenePos, data.data.planets);
                    this.world.setSystemOpacity(0);
                    // МАЯЧОК УДАЛЁН (юзер): квадрат на точке влёта мешал.
                    this.world.hideBeacon();
                    this.world.setSystemLabelHidden(system.seed);
                },
                () => {
                    this.busy = false;
                    this.activeSystem = system;
                    const galaxy = this.activeGalaxy;
                    if (galaxy) this.callbacks.onSystemSelected?.(galaxy, system);
                    this.mode = 'star-system';
                    this.locations.push({ kind: 'system', seed: system.seed, name: system.name, spectralType: system.spectralType });
                    this.world.setSystemOpacity(1);
                    this.world.setSunFade(1);
                    this.world.setSystemsMapOpacity(0);
                    this.world.setGalaxyBackdropOpacity(0);
                    this.world.hideBeacon();
                },
            );
        } catch (err) {
            this.busy = false;
            console.error('Failed to enter system:', err);
        }
    }

    // ===== Переход: клик по планете =====
    // Планета выбрана в сцене системы: входим на её поверхность (SurfaceRenderer).
    public async enterPlanet(planet: Planet, camera: THREE.PerspectiveCamera): Promise<void> {
        if (this.mode !== 'star-system' || this.isTransitioning()) return;
        const sysRenderer = this.world.getSystemRenderer();
        if (!sysRenderer) return;
        const planetWorld = sysRenderer.getPlanetWorldPosition(planet.seed);
        if (!planetWorld) return;
        this.busy = true;
        try {
            // Колония (если есть) — для terran/заселённых планет.
            let buildings: readonly Building[] = [];
            try {
                const colony = await this.client.getColonyArea({
                    planetSeed: planet.seed,
                    face: 2, depth: 3, x: 2, y: 2, size: 4,
                });
                buildings = colony.data.buildings;
            } catch {
                buildings = [];
            }

            const start = camera.position.clone();
            // ФИНИШ: обзорная поза НАД планетой (как enterSystem, но ближе —
            // радиус поверхности 10, дистанция R*2.4). Центр = мировая поза
            // планеты на её текущей орбите.
            const elev = THREE.MathUtils.degToRad(63);
            const dist = 10 * 2.4;
            const end = new THREE.Vector3(
                planetWorld.x,
                planetWorld.y + Math.sin(elev) * dist,
                planetWorld.z + Math.cos(elev) * dist,
            );

            // Направление на солнце (для подсветки терминатора/атмосферы).
            const sunPos = this.world.getSystemRenderer()?.getStarWorldPosition();
            const sunDir = sunPos
                ? planetWorld.clone().sub(sunPos).normalize()
                : new THREE.Vector3(1, 0.3, 0.5).normalize();
            this.world.setSunDirection(sunDir);

            // Деплой поверхности прямо в корне мира в позе планеты.
            this.transition.start(
                {
                    duration: this.flyDuration(start, end),
                    start,
                    end,
                    trackLookAt: planetWorld.clone(),
                    fovFrom: camera.fov,
                    fovTo: 55,
                    progressRaw: true,
                    onProgress: (t) => {
                        // Система гаснет, планета проступает (как у входа в систему).
                        this.world.setSystemOpacity(1 - THREE.MathUtils.clamp((t - 0.25) / 0.75, 0, 1));
                        this.world.setPlanetOpacity(THREE.MathUtils.clamp((t - 0.25) / 0.75, 0, 1));
                        this.world.setAtmosphereOpacity(
                            THREE.MathUtils.clamp((t - 0.4) / 0.6, 0, 1.5),
                            THREE.MathUtils.clamp((t - 0.4) / 0.6, 0, 1),
                        );
                    },
                },
                () => {
                    this.world.showPlanet(planet, planetWorld.clone(), buildings);
                    this.world.setPlanetOpacity(0);
                    this.world.setAtmosphereOpacity(0, 0);
                },
                () => {
                    this.busy = false;
                    this.activePlanet = planet;
                    this.mode = 'planet-surface';
                    this.locations.push({
                        kind: 'planet',
                        seed: planet.seed,
                        index: planet.index,
                        type: planet.type,
                    });
                    this.world.setPlanetOpacity(1);
                    this.world.setAtmosphereOpacity(1, planet.type === 'gas' ? 0 : 1);
                    // Погода по типу планеты (если включена).
                    if (planet.type === 'terran' || planet.type === 'ice') {
                        this.world.setWeather(planet.type === 'ice' ? 'snow' : 'rain');
                    } else {
                        this.world.setWeather('none');
                    }
                },
            );
        } catch (err) {
            this.busy = false;
            console.error('Failed to enter planet:', err);
        }
    }

    /**
     * ФРАКТАЛ: вход в галактику, стримящуюся ВНУТРИ системы. Полёт по
     * прямой с трекингом узла (те же правила линейки), финал — стандартная
     * обзорная поза R*2.4 НАД узлом в мировых координатах слоя (масштаб
     * уже применён матрицей слоя).
     */
    public async enterSystemGalaxy(galaxy: Galaxy, camera: THREE.PerspectiveCamera): Promise<void> {
        if (this.mode !== 'system-galaxies' && this.mode !== 'star-system') return;
        if (this.isTransitioning() || !this.world.getInnerMapRenderer()) return;
        this.busy = true;
        try {
            const data = await this.client.getStarSystems(galaxy.seed, galaxy.radius);
            this.universePose = null;
            const start = camera.position.clone();
            // Локальная точка узла -> мир (матрица слоя применяет масштаб 0.02)
            const worldPos = this.world.innerMapToWorld(
                new THREE.Vector3(galaxy.x, galaxy.y, galaxy.z));
            const dist = galaxy.radius * 2.4;
            const elev = THREE.MathUtils.degToRad(63);
            const end = new THREE.Vector3(
                worldPos.x,
                worldPos.y + Math.sin(elev) * dist,
                worldPos.z + Math.cos(elev) * dist,
            );
            this.transition.start(
                {
                    duration: this.flyDuration(start, end),
                    start,
                    end,
                    trackLookAt: worldPos.clone(),
                    fovFrom: camera.fov,
                    fovTo: 55,
                    onProgress: (t) => {
                        this.world.setInnerMapOpacity(THREE.MathUtils.clamp((t - 0.35) / 0.65, 0, 1));
                    },
                },
                () => {
                    // Узел уже отрендерен стримингом; ничего прятать не нужно.
                },
                () => {
                    this.busy = false;
                    this.mode = 'galaxy-systems';
                    this.locations.push({ kind: 'galaxy', seed: galaxy.seed, name: galaxy.name, type: galaxy.type });
                    this.callbacks.onGalaxySelected?.(galaxy);
                },
            );
        } catch (err) {
            this.busy = false;
            console.error('Failed to enter system galaxy:', err);
        }
    }

    // ===== Отлёт: обратные анимации (спиральный подъём/отдаление) =====
    public returnToSystem(camera: THREE.PerspectiveCamera, orbitFocus?: { target: THREE.Vector3; distance: number; pitch: number }): void {
        if (this.mode !== 'planet-surface' || this.transition.isTransitioning()) return;
        // Конец — АКТУАЛЬНАЯ орбитальная поза карты системы (единая схема
        // с возвратами на другие карты), а не снапшот момента входа.
        let end: THREE.Vector3;
        let endQuat: THREE.Quaternion | undefined;
        if (orbitFocus) {
            const ce = Math.cos(orbitFocus.pitch);
            const se = Math.sin(orbitFocus.pitch);
            end = new THREE.Vector3(
                orbitFocus.target.x,
                orbitFocus.target.y + orbitFocus.distance * se,
                orbitFocus.target.z + orbitFocus.distance * ce,
            );
            const m = new THREE.Matrix4().lookAt(end, orbitFocus.target, new THREE.Vector3(0, 1, 0));
            endQuat = new THREE.Quaternion().setFromRotationMatrix(m);
        } else {
            const pose = this.systemPose;
            end = pose ? pose.position.clone() : camera.position.clone();
            endQuat = pose ? pose.quaternion : undefined;
        }
        // Отдаление по спирали: контрольная точка сбоку от прямой.
        const start = camera.position.clone();
        const side = new THREE.Vector3().subVectors(end, start)
            .cross(new THREE.Vector3(0, 1, 0)).normalize();
        const control = start.clone().lerp(end, 0.4).add(side.multiplyScalar(start.distanceTo(end) * 0.25));
        this.transition.start(
            {
                duration: this.flyDuration(start, end),
                start,
                end,
                control,
                endQuaternion: endQuat,
                fovFrom: camera.fov,
                fovTo: 55,
                shakeHead: 0.04,
                onProgress: (t) => {
                    this.world.setPlanetOpacity(1 - THREE.MathUtils.clamp(t / 0.6, 0, 1));
                    this.world.setSystemOpacity(THREE.MathUtils.clamp((t - 0.4) / 0.6, 0, 1));
                    // Обратный выход из атмосферы: плазма снизу вверх на старте.
                    if (t < 0.3) {
                        this.fx.setPlasma(Math.sin((t / 0.3) * Math.PI) * 0.8);
                    } else {
                        this.fx.setPlasma(0);
                    }
                    // Погода гаснет сразу после старта отлёта.
                    if (t > 0.25) this.world.setWeather('none');
                },
            },
            undefined,
            () => {
                this.world.hidePlanet();
                this.mode = 'star-system';
                this.locations.popTo('system');
                this.fx.clear();
            },
        );
    }

    public returnToGalaxy(camera: THREE.PerspectiveCamera, orbitFocus?: { target: THREE.Vector3; distance: number; pitch: number }): void {
        if (this.mode !== 'star-system' || this.transition.isTransitioning()) return;
        // БЕЗ ПАМЯТИ КАМЕРЫ (юзер, 2026-08-26): возврат всегда летит в
        // КАНОНический обзор карты галактики — та же формула, что у финиша
        // enterGalaxy (63°, R*2.4 над центром). Панорама/зум/наклон юзера
        // НЕ переживают выход из системы: каждый вход выглядит как первый.
        let end: THREE.Vector3;
        let endQuat: THREE.Quaternion | undefined;
        const gal = this.activeGalaxy;
        if (gal) {
            const dist = gal.radius * 2.4;
            const elev = THREE.MathUtils.degToRad(63);
            const center = new THREE.Vector3(gal.x, gal.y, gal.z);
            end = new THREE.Vector3(
                gal.x,
                gal.y + Math.sin(elev) * dist,
                gal.z + Math.cos(elev) * dist,
            );
            const m = new THREE.Matrix4().lookAt(end, center, new THREE.Vector3(0, 1, 0));
            endQuat = new THREE.Quaternion().setFromRotationMatrix(m);
        } else if (orbitFocus) {
            const ce = Math.cos(orbitFocus.pitch);
            const se = Math.sin(orbitFocus.pitch);
            end = new THREE.Vector3(
                orbitFocus.target.x,
                orbitFocus.target.y + orbitFocus.distance * se,
                orbitFocus.target.z + orbitFocus.distance * ce,
            );
            const m = new THREE.Matrix4().lookAt(end, orbitFocus.target, new THREE.Vector3(0, 1, 0));
            endQuat = new THREE.Quaternion().setFromRotationMatrix(m);
        } else {
            end = camera.position.clone();
        }
        // ЛИНИЯ ОТЛЁТА = ПРЯМАЯ (единые правила с прямыми перелётами):
        // камера идёт по линейке от текущей позы системы к АКТУАЛЬНОЙ позе
        // карты галактики. ТРЕКИНГ-ЦЕЛЬ = центр галактики: куда бы ни смотрела
        // орбитальная камера в системе, отлёт начинается с центрирования
        // родной галактики, и она остаётся по курсу весь путь.
        const start = camera.position.clone();
        // ВЫХОД = ИНВЕРСИЯ ВХОДА (юзер): позиция зеркальна по прямой, а
        // ориентация просто slerp'ится от текущей к сохранённой позе клика.
        // ВАЖНО: БЕЗ trackLookAt — совместное использование endQuaternion и
        // трекинга давало конфликт: lookAt(end,end) вырожден, ориентация
        // недетерминирована => камеру крутило и прыгало на старте отлёта.
        this.transition.start(
            {
                duration: this.flyDuration(start, end),
                start,
                end,
                endQuaternion: endQuat,
                fovFrom: camera.fov,
                fovTo: 55,
                onProgress: (t) => {
                    this.world.setSystemOpacity(1 - THREE.MathUtils.clamp(t / 0.55, 0, 1));
                    this.world.setGalaxyBackdropOpacity(THREE.MathUtils.clamp((t - 0.35) / 0.65, 0, 1));
                    this.world.setSystemsMapOpacity(THREE.MathUtils.clamp((t - 0.55) / 0.45, 0, 1));
                },
            },
            undefined,
            () => {
                this.world.hideSystem();
                this.world.hideBeacon();
                this.exitInnerMap();
                this.mode = 'galaxy-systems';
                this.locations.popTo('galaxy');
            },
        );
    }

    public returnToUniverseMap(camera: THREE.PerspectiveCamera, home?: { target: THREE.Vector3; distance: number }): void {
        if (this.mode !== 'galaxy-systems' || this.transition.isTransitioning()) return;
        // Если известен АКТУАЛЬНЫЙ фокус камеры вселенной (куда смотрел
        // пользователь до входа, с учётом панорам) — летим туда. Иначе — дом.
        const end = home
            ? new THREE.Vector3(
                  home.target.x,
                  home.target.y + Math.sin(THREE.MathUtils.degToRad(63)) * home.distance,
                  home.target.z + Math.cos(THREE.MathUtils.degToRad(63)) * home.distance,
              )
            : (this.universePose?.position.clone() ?? UNIVERSE_HOME.clone());
        const start = camera.position.clone();
        const side = new THREE.Vector3().subVectors(end, start)
            .cross(new THREE.Vector3(0, 1, 0)).normalize();
        const control = start.clone().lerp(end, 0.45)
            .add(new THREE.Vector3(0, start.distanceTo(end) * 0.18, 0))
            .add(side.multiplyScalar(start.distanceTo(end) * 0.15));
        this.transition.start(
            {
                duration: this.flyDuration(start, end),
                start,
                end,
                control,
                // УГОЛ ВСЕЛЕННОЙ НЕ ЗАПОМИНАЕТСЯ (юзер): ориентация финиша =
                // КАНОН 63° (взгляд вниз-на-юг), как у update() контроллера
                // после resetTilt() — стык без рывка угла.
                endQuaternion: new THREE.Quaternion().setFromRotationMatrix(
                    new THREE.Matrix4().lookAt(
                        end,
                        end.clone().add(new THREE.Vector3(
                            0,
                            -Math.sin(THREE.MathUtils.degToRad(63)),
                            -Math.cos(THREE.MathUtils.degToRad(63)),
                        )),
                        new THREE.Vector3(0, 1, 0),
                    ),
                ),
                fovFrom: camera.fov,
                fovTo: 60,
                onProgress: (t) => {
                    // Галактика сжимается в узел: карта систем гаснет первой,
                    // фон-диск держится дольше и схлопывается в точку.
                    this.world.setSystemsMapOpacity(1 - THREE.MathUtils.clamp(t / 0.5, 0, 1));
                    this.world.setGalaxyBackdropOpacity(1 - THREE.MathUtils.clamp((t - 0.25) / 0.75, 0, 1));
                    this.world.setUniverseOpacity(THREE.MathUtils.clamp((t - 0.45) / 0.55, 0, 1));
                    this.world.setAttractorOpacity(THREE.MathUtils.clamp((t - 0.45) / 0.55, 0, 1));
                },
            },
            undefined,
            () => {
                this.world.hideGalaxy();
                this.exitInnerMap();
                this.mode = 'universe-map';
                this.locations.popTo('universe');
            },
        );
    }

    // ===== ФРАКТАЛ: галактики внутри звёздной системы =====

    /**
     * Поднимает вложенную карту галактик в точке системы. Тот же стриминг,
     * что у карты вселенной, но seed = сид системы (детерминированный фрактал).
     */
    private enterInnerMap(system: StarSystem): void {
        this.innerSeed = system.seed;
        const origin = this.world.getSystemLayer()?.position ?? new THREE.Vector3();
        const renderer = this.world.showInnerMap(origin);
        renderer.setGlobalOpacity(1);
        this.systemGalaxyMap = new GalaxyMapScene(
            this.universeSeed,
            this.client,
            this.world.seedGraph,
            renderer,
            () => system.seed,
        );
        // Локальный мир карты: центр = позиция системы, масштаб слоя.
        this.systemGalaxyMap.setFrame(origin.x, origin.z, this.world.getInnerMapScale());
    }

    private exitInnerMap(): void {
        if (this.systemGalaxyMap) {
            this.systemGalaxyMap.dispose();
            this.systemGalaxyMap = null;
        }
        this.innerSeed = null;
        this.world.hideInnerMap();
    }

    /** Есть ли вложенная карта у текущей системы. */
    public hasInnerMap(): boolean { return this.innerSeed !== null; }

    // ===== Фокус планеты: дабл-клик в системе =====
    /**
     * Фокус планеты — это НЕ вход на поверхность, а крупный боковой план
     * прямо в режиме star-system. Камера ПЛАВНО ПРИЛИПАЕТ к планете сбоку
     * (касательно к орбите, чуть выше эклиптики): цель пересчитывается
     * каждый кадр, поэтому планета занимает весь экран И не «телепортируется»
     * при движении по орбите.
     */
    private planetFocusSeed: number | null = null;
    /** true, пока идёт анимация долёта/выхода — блокируем орбитальное управление. */
    private focusAnimating = false;
    /** Время долёта для блокировки ввода (сек). */
    private focusElapsed = 0;
    private focusDuration = 2.5;

    /** true, пока камера «привязана» к планете (долёт, удержание или выход). */
    public isPlanetFocusActive(): boolean {
        return this.planetFocusSeed !== null;
    }

    /** true, когда долёт завершён и поза просто удерживается (ввод заблокирован). */
    public isPlanetFocused(): boolean {
        return this.planetFocusSeed !== null && !this.focusAnimating && !this.transition.isTransitioning();
    }

    /**
     * Включает режим фокуса: камера начинает плавно прилипать к планете.
     * Позиция НЕ замораживается — updatePlanetFocus ведёт камеру к ЖИВОЙ
     * цели каждый кадр (без скачка при движении планеты по орбите).
     */
    public focusPlanet(planet: Planet, camera: THREE.PerspectiveCamera): void {
        if (this.mode !== 'star-system' || this.isPlanetFocusActive() || this.isTransitioning()) return;
        const sysRenderer = this.world.getSystemRenderer();
        if (!sysRenderer) return;
        const planetWorld = sysRenderer.getPlanetWorldPosition(planet.seed);
        const radius = sysRenderer.getPlanetRenderRadius(planet.seed);
        if (!planetWorld || radius === null || radius <= 0) return;

        this.planetFocusSeed = planet.seed;
        this.focusAnimating = true;
        this.focusElapsed = 0;
        // Длительность блокировки ввода ~ как у перелёта, но без телепорта позы.
        this.focusDuration = THREE.MathUtils.clamp(
            camera.position.distanceTo(planetWorld) / 1800, 1.4, 3.2,
        );
    }

    /**
     * ПЛАВНЫЙ выход из фокуса обратно в обзорную карту системы. Финиш
     * перехода совпадает с канонической позой орбитальной камеры (63°, R*2.4),
     * поэтому последующий systemOrbit.attach не даёт рывка.
     */
    public exitPlanetFocus(camera: THREE.PerspectiveCamera): void {
        if (this.planetFocusSeed === null || this.isTransitioning()) return;
        const center = this.getActiveSystemCenter();
        if (!center) { this.planetFocusSeed = null; return; }
        const radius = this.getActiveSystemRadius();
        const dist = this.getActiveSystemDistance();
        const elev = THREE.MathUtils.degToRad(63);
        const end = new THREE.Vector3(
            center.x,
            center.y + Math.sin(elev) * dist,
            center.z + Math.cos(elev) * dist,
        );
        const m = new THREE.Matrix4().lookAt(end, center, new THREE.Vector3(0, 1, 0));
        const endQuat = new THREE.Quaternion().setFromRotationMatrix(m);
        const start = camera.position.clone();
        // Солнце возвращается к полной яркости по ходу отлёта.
        this.transition.start(
            {
                duration: this.flyDuration(start, end),
                start,
                end,
                endQuaternion: endQuat,
                fovFrom: camera.fov,
                fovTo: 55,
                onProgress: (t) => {
                    this.world.setSunFade(THREE.MathUtils.clamp(t, 0, 1));
                },
            },
            undefined,
            () => {
                // Финиш = обзорная поза orbit => attach без рывка. Снимаем фокус.
                this.planetFocusSeed = null;
            },
        );
    }

    /**
     * Ежекaдровое ведение камеры в фокусе планеты: позиция ЭКСПОНЕНЦИАЛЬНО
     * прилипает к ЖИВОЙ боковой цели (планета движется по орбите, цель
     * пересчитывается каждый кадр => скачка нет). Возврат ведёт TransitionManager.
     */
    public updatePlanetFocus(camera: THREE.PerspectiveCamera, dt: number): void {
        if (this.planetFocusSeed === null || this.transition.isTransitioning()) return;
        if (this.focusAnimating) {
            this.focusElapsed += dt;
            if (this.focusElapsed >= this.focusDuration) this.focusAnimating = false;
        }
        const sysRenderer = this.world.getSystemRenderer();
        if (!sysRenderer) return;
        const planetWorld = sysRenderer.getPlanetWorldPosition(this.planetFocusSeed);
        const radius = sysRenderer.getPlanetRenderRadius(this.planetFocusSeed);
        if (!planetWorld || radius === null || radius <= 0) return;

        // Дистанция «на весь экран»: радиус / sin(fov/2), множитель 1.15 — зазор.
        const halfFov = THREE.MathUtils.degToRad(camera.fov) / 2;
        const dist = (radius / Math.sin(halfFov)) * 1.15;
        // Боковой ракурс: касатель к орбите + лёгкий подъём над эклиптикой.
        const center = this.getActiveSystemCenter() ?? planetWorld.clone();
        const radial = planetWorld.clone().sub(center);
        radial.y = 0;
        const tangent = new THREE.Vector3(-radial.z, 0, radial.x).normalize();
        const side = tangent.multiplyScalar(dist);
        const height = radius * 0.55 + dist * Math.sin(THREE.MathUtils.degToRad(18));
        const target = new THREE.Vector3(
            planetWorld.x + side.x,
            planetWorld.y + height,
            planetWorld.z + side.z,
        );

        // Экспоненциальное сглаживание к ЖИВОЙ цели — плавный долёт и удержание
        // без телепорта при движении планеты по орбите. И ПОЗИЦИЯ, И ВЗГЛЯД
        // сглаживаются: мгновенный lookAt дёргал камеру в начале (когда она
        // ещё высоко, а цель уже внизу у планеты).
        const kPos = 1 - Math.exp(-dt * 4.5);
        camera.position.lerp(target, kPos);
        const lookM = new THREE.Matrix4().lookAt(target, planetWorld, new THREE.Vector3(0, 1, 0));
        const targetQuat = new THREE.Quaternion().setFromRotationMatrix(lookM);
        // Взгляд чуть отзывчивее позиции, но без рывка.
        camera.quaternion.slerp(targetQuat, 1 - Math.exp(-dt * 6));
    }

    public dispose(): void {
        this.universeMap.dispose();
        this.exitInnerMap();
        this.world.hideGalaxy();
    }
}

