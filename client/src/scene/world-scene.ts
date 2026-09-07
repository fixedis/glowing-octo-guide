// client/src/scene/world-scene.ts
import * as THREE from 'three';
import { SeedGraph } from '../core/seed-graph.js';
import type { Building, Galaxy, Planet, Route, StarSystem } from '../core/types.js';
import { GalaxyDust } from './fx/galaxy-dust.js';
import { MortisGalaxy } from './fx/mortis-galaxy.js';
import { GalaxyShape } from '../core/galaxy-shape.js';
import { PlanetAtmosphere } from './fx/planet-atmosphere.js';
import { planetGenerator } from '../core/planet-generator.js';
import { VolumetricClouds } from './fx/volumetric-clouds.js';
import { Weather, type WeatherKind } from './fx/weather.js';
import { GalaxyRenderer } from './galaxy-renderer.js';
import { SurfaceRenderer, PLANET_RADIUS } from './surface-renderer.js';
import { SystemRenderer } from './system-renderer.js';
import { SystemsRenderer } from './systems-renderer.js';

/**
 * Одна литая сцена. Слои: Аттрактор → вселенная → галактика → система → планета.
 * Никаких переключений сцен — только прозрачность и transform.
 */
export class WorldScene {
    readonly scene = new THREE.Scene();
    readonly seedGraph = new SeedGraph();

    private readonly universeRenderer: GalaxyRenderer;

    private galaxyLayer: THREE.Group | null = null;
    private galaxySprite: THREE.Sprite | null = null;
    private galaxyDust: GalaxyDust | null = null;
    /** Полноценная хоррор-галактика MORTIS (частицы, ядро, туманности). */
    private mortisGalaxy: MortisGalaxy | null = null;
    private systemsRenderer: SystemsRenderer | null = null;

    private systemLayer: THREE.Group | null = null;
    private systemRenderer: SystemRenderer | null = null;

    /**
     * ФРАКТАЛ: вложенная галактическая карта внутри активной системы.
     * Живёт КОРНЕ сцены в позиции системы (масштаб 0.02), рендерится
     * собственным GalaxyRenderer — полный аналог карты вселенной.
     */
    private innerMapLayer: THREE.Group | null = null;
    private innerMapRenderer: GalaxyRenderer | null = null;
    private readonly innerMapScale = 0.02;

    /**
     * МАЯЧОК ЦЕЛИ: временный маркер перелёта Г→С. sizeAttenuation=false
     * даёт КОНСТАНТНЫЙ размер на экране (~10px) — звезда r=0.68 субпиксельная
     * издалека, а маячок держит точку клика видимой всю дорогу.
     */
    private beacon: THREE.Sprite | null = null;

    private planetLayer: THREE.Group | null = null;
    private surfaceRenderer: SurfaceRenderer | null = null;
    private atmosphere: PlanetAtmosphere | null = null;
    private readonly clouds: VolumetricClouds;
    private readonly weather: Weather;

    galaxySpinEnabled = true;
    private galaxySpinSpeed = 0.02;
    private time = 0;
    /** Позиция камеры для погодных частиц (обновляется SceneManager). */
    private weatherCameraPos: THREE.Vector3 | null = null;
    /** Позиция камеры для засветки фона вокруг диска солнца (режим star-system). */
    private systemCameraPos: THREE.Vector3 | null = null;
    /** Сама камера (для корректного frustum-cull нанит-меша планеты). */
    private systemCamera: THREE.Camera | null = null;

    /** SceneManager сообщает позицию камеры для эффектов, привязанных к ней. */
    public setCameraPosition(pos: THREE.Vector3): void {
        this.weatherCameraPos = pos.clone();
    }

    /** Позиция камеры для засветки фона вокруг диска солнца (star-system). */
    public setSystemCamera(cam: THREE.Camera): void {
        this.systemCameraPos = cam.position.clone();
        this.systemCamera = cam;
    }

    public constructor() {
        this.scene.background = new THREE.Color(0x010103);
        // Погодные частицы живут прямо в сцене (следуют за камерой).
        this.weather = new Weather();
        this.scene.add(this.weather.getObject());
        // Облака создаются один раз, деплоятся при входе в атмосферу.
        const rng = this.seedGraph.rng('fx/volumetric-clouds');
        this.clouds = new VolumetricClouds(rng);
        this.scene.add(this.clouds.getObject());
        // Сфера-Аттрактор УДАЛЕНА: фон карты вселенной — чистый войд.
        // Слой вселенной (точки галактик).
        this.universeRenderer = new GalaxyRenderer(this.seedGraph);
        this.scene.add(this.universeRenderer.getObject());
    }

    // --- Аттрактор ---
    public setAttractorOpacity(t: number): void {
        void t; // сфера убрана — метод оставлен для совместимости переходов.
    }

    // --- Вселенная ---
    public getUniverseRenderer(): GalaxyRenderer { return this.universeRenderer; }
    public setUniverseOpacity(t: number): void { this.universeRenderer.setGlobalOpacity(t); }

    /** Прячет лейбл системы на карте галактики (квадрат у лица при посадке). */
    public setSystemLabelHidden(seed: number): void {
        this.systemsRenderer?.setSystemLabelVisible(seed, false);
    }

    // --- Диагностические геттеры прозрачностей (для живых замеров) ---
    private lastBackdropOpacity = 0;
    private lastSystemOpacity = 1;
    private lastSystemsMapOpacity = 1;
    public getBackdropOpacity(): number { return this.lastBackdropOpacity; }
    public getSystemLayerOpacity(): number { return this.lastSystemOpacity; }
    public getSystemsMapOpacity(): number { return this.lastSystemsMapOpacity; }

    // --- Галактика (фон + карта систем) ---
    public showGalaxy(galaxy: Galaxy, systems: readonly StarSystem[], routes: readonly Route[]): void {
        this.hideGalaxy();
        const layer = new THREE.Group();
        layer.position.set(galaxy.x, galaxy.y, galaxy.z);
        // Диск строится в ЛОКАЛЬНОЙ плоскости XY слоя (частицы MORTIS и
        // звёздные системы PHP — одни оси => копланарны). Наклон слоя на -90°
        // по X ложит диск ГОРИЗОНТАЛЬНО в мир (нормаль = мировая ось Y):
        // камера сверху видит карту столом, а не монетой на ребре.
        // Спин layer.rotation.z после наклона вращает диск вокруг мировой Y.
        layer.rotation.x = -Math.PI / 2;
        // MORTIS-галактика: частицы рукавов/пыли/угольков + ядро + туманности.
        // Форма спирали — из GalaxyShape, той же, что раскладывает системы PHP.
        const shape = GalaxyShape.create(this.seedGraph, galaxy.seed);
        const mortis = new MortisGalaxy(
            shape,
            galaxy.radius,
            this.seedGraph.hash('galaxy/' + galaxy.seed + '/mortis/build'),
            this.seedGraph,
        );
        mortis.setOpacity(0);
        layer.add(mortis.getObject());
        this.mortisGalaxy = mortis;
        // Скорость/направление вращения диска — ВКРУЧИВАНИЕ ПО СПИРАЛИ:
        // рукава закручены наружу ПРОТИВ часовой (twist > 0 в GalaxyShape),
        // поэтому материя обязана течь ПО часовой — к центру вдоль рукава.
        // Минус = направление вкручивания; 0.12 — «величественный» темп
        // (значение в GalaxyShape не меняем — там кросс-фикстура с PHP).
        this.galaxySpinSpeed = -shape.spinSpeed * 0.12;
        this.galaxySpinEnabled = true;
        // Фон-галактика (спрайт-спираль) остаётся для дальнего боке: он гаснет
        // при пике к системе раньше деталей (концепт «размытое световое пятно»).
        const sprite = this.makeGalaxySprite(galaxy);
        layer.add(sprite);
        this.galaxySprite = sprite;
        // Карта систем с путями.
        this.systemsRenderer = new SystemsRenderer(this.seedGraph);
        this.systemsRenderer.setSystemsAndRoutes(systems, routes);
        this.systemsRenderer.setGlobalOpacity(0);
        layer.add(this.systemsRenderer.getObject());
        layer.rotation.y = 0;
        this.galaxyLayer = layer;
        this.scene.add(layer);
    }
    public setGalaxyOpacity(t: number): void {
        const c = THREE.MathUtils.clamp(t, 0, 1);
        if (this.mortisGalaxy) this.mortisGalaxy.setOpacity(c);
        if (this.galaxySprite) (this.galaxySprite.material as THREE.SpriteMaterial).opacity = c * 0.35;
        if (this.systemsRenderer) this.systemsRenderer.setGlobalOpacity(c);
    }
    /**
     * Раздельное боке: фон-спрайт и детали рукавов гаснут по-разному
     * (при пике к системе фон превращается в размытое световое пятно).
     */
    public setGalaxyBackdropOpacity(t: number): void {
        const c = THREE.MathUtils.clamp(t, 0, 1);
        this.lastBackdropOpacity = c;
        if (this.mortisGalaxy) this.mortisGalaxy.setOpacity(c);
        if (this.galaxySprite) (this.galaxySprite.material as THREE.SpriteMaterial).opacity = c * 0.35;
    }
    /** Прозрачность только карты систем/маршрутов (без фона галактики). */
    public setSystemsMapOpacity(t: number): void {
        const c = THREE.MathUtils.clamp(t, 0, 1);
        this.lastSystemsMapOpacity = c;
        if (this.systemsRenderer) this.systemsRenderer.setGlobalOpacity(c);
    }
    public getSystemsRenderer(): SystemsRenderer | null { return this.systemsRenderer; }
    public getGalaxyLayer(): THREE.Group | null { return this.galaxyLayer; }

    /** Мировая позиция системы на карте галактики (null — не найдена). */
    public findSystemsMapPosition(seed: number): THREE.Vector3 | null {
        if (!this.systemsRenderer) return null;
        return this.systemsRenderer.findSystemWorldPosition(seed);
    }

    /**
     * Точка деплоя сцены системы: БЕЗ cameraPos — фиксированный вынос ×10
     * вдоль луча «центр слоя → звезда» (fallback). С cameraPos и span —
     * НА ЛУЧЕ ВЗГЛЯДА «камера → звезда», ровно в span от камеры: точка
     * клика остаётся на курсе весь полёт (звезда и деплой на одном луче),
     * прилёт не уводит камеру вбок от нажатия.
     */
    public getSystemDeployPos(
        mapPos: THREE.Vector3,
        cameraPos?: THREE.Vector3,
        span?: number,
    ): THREE.Vector3 {
        const layer = this.galaxyLayer;
        if (!layer) return mapPos.clone();
        // Длину снимаем ДО нормализации: normalize() мутирует вектор.
        const dist = mapPos.distanceTo(layer.position);
        if (dist < 1e-6) return mapPos.clone();
        const dir = mapPos.clone().sub(layer.position).divideScalar(dist);
        // Fallback: старое поведение ×10 от центра галактики.
        const fallback = layer.position.clone().addScaledVector(dir, dist * 10);
        if (!cameraPos || !span || span <= 0) {
            return fallback;
        }
        // Деплой ПО ЛУЧУ «камера → звезда»: камера + направление на звезду * span.
        const toStar = mapPos.clone().sub(cameraPos);
        if (toStar.lengthSq() < 1e-6) {
            return fallback;
        }
        return cameraPos.clone().addScaledVector(toStar.normalize(), span);
    }

    // --- Система (солнце + планеты) — ОТДЕЛЬНАЯ сцена в стороне от карты галактики ---
    public showSystemAt(
        system: StarSystem,
        spectral: StarSystem['spectralType'],
        seed: number,
        worldPos: THREE.Vector3,
        planets: readonly Planet[] = [],
    ): void {
        this.hideSystem();
        const layer = new THREE.Group();
        // Система — отдельная сцена: живёт в КОРНЕ сцены в своей точке мира
        // (в стороне от карты галактики), без наследования её трансформаций.
        layer.position.copy(worldPos);
        this.systemRenderer = new SystemRenderer(this.seedGraph);
        this.systemRenderer.setSystem({ spectralType: spectral, seed }, planets);
        this.systemRenderer.setGlobalOpacity(0);
        layer.add(this.systemRenderer.getObject());
        this.systemLayer = layer;
        this.scene.add(layer);
        // При входе в систему галактика перестаёт крутиться.
        this.galaxySpinEnabled = false;
    }
    public setSystemOpacity(t: number): void {
        const c = THREE.MathUtils.clamp(t, 0, 1);
        this.lastSystemOpacity = c;
        if (this.systemRenderer) this.systemRenderer.setGlobalOpacity(c);
    }
    /**
     * Зум-гашение ТОЛЬКО солнца («система = точка на фоне галактики»):
     * небо-окружение остаётся видимым на любой дистанции.
     */
    public setSunFade(t: number): void {
        this.systemRenderer?.setSunFade(t);
    }
    public getSystemRenderer(): SystemRenderer | null { return this.systemRenderer; }
    public getSystemLayer(): THREE.Group | null { return this.systemLayer; }

    // --- Вложенная галактика (фрактал: карта внутри системы) ---

    /**
     * Показывает вложенную карту галактик в точке системы. Слой
     * масштабируется (0.02), поэтому «вселенная» умещается вокруг солнца,
     * а перелёты к её узлам происходят в локальном масштабе.
     */
    public showInnerMap(worldPos: THREE.Vector3): GalaxyRenderer {
        this.hideInnerMap();
        const layer = new THREE.Group();
        layer.position.copy(worldPos);
        layer.scale.setScalar(this.innerMapScale);
        this.innerMapRenderer = new GalaxyRenderer(this.seedGraph);
        layer.add(this.innerMapRenderer.getObject());
        this.innerMapLayer = layer;
        this.scene.add(layer);
        return this.innerMapRenderer;
    }
    public getInnerMapRenderer(): GalaxyRenderer | null { return this.innerMapRenderer; }
    public getInnerMapScale(): number { return this.innerMapScale; }
    /** Мировая позиция узла вложенной карты: локаль -> мир слоя. */
    public innerMapToWorld(localPos: THREE.Vector3): THREE.Vector3 {
        if (!this.innerMapLayer) return localPos.clone();
        return this.innerMapLayer.updateMatrixWorld(), localPos.clone().applyMatrix4(this.innerMapLayer.matrixWorld);
    }
    public setInnerMapOpacity(t: number): void {
        const c = THREE.MathUtils.clamp(t, 0, 1);
        if (this.innerMapRenderer) this.innerMapRenderer.setGlobalOpacity(c);
    }
    public hideInnerMap(): void {
        if (this.innerMapLayer) { this.scene.remove(this.innerMapLayer); this.innerMapLayer = null; }
        if (this.innerMapRenderer) { this.innerMapRenderer.dispose(); this.innerMapRenderer = null; }
    }

    // --- Маячок цели (временный маркер полёта) ---

    /** Показывает маячок в мировой точке цели (константный экран. размер). */
    public showBeacon(worldPos: THREE.Vector3): void {
        this.hideBeacon();
        const mat = new THREE.SpriteMaterial({
            color: 0xffd27a,
            sizeAttenuation: false,
            transparent: true,
            opacity: 0,
            depthTest: false,
        });
        this.beacon = new THREE.Sprite(mat);
        this.beacon.scale.setScalar(0.018);
        this.beacon.position.copy(worldPos);
        this.beacon.renderOrder = 999;
        this.scene.add(this.beacon);
    }

    /** Прозрачность маячка (0..1). */
    public setBeaconOpacity(t: number): void {
        if (this.beacon) {
            (this.beacon.material as THREE.SpriteMaterial).opacity =
                THREE.MathUtils.clamp(t, 0, 1);
        }
    }

    public hideBeacon(): void {
        if (this.beacon) {
            const mat = this.beacon.material as THREE.SpriteMaterial;
            mat.map?.dispose();
            mat.dispose();
            this.beacon.parent?.remove(this.beacon);
            this.beacon = null;
        }
    }

    // --- Планета (рельеф + колонии) ---
    public showPlanet(planet: Planet, worldPos: THREE.Vector3, buildings: readonly Building[]): void {
        this.hidePlanet();
        const layer = new THREE.Group();
        layer.position.copy(worldPos);
        this.surfaceRenderer = new SurfaceRenderer(this.seedGraph);
        this.surfaceRenderer.setPlanet(planet);
        this.surfaceRenderer.setGlobalOpacity(0);
        if (buildings.length > 0) {
            this.surfaceRenderer.setColony(buildings, 2, 3, 2, 2, 4);
        }
        layer.add(this.surfaceRenderer.getObject());
        // Атмосфера + облака + лимб-ореол (расширенный генератор по variant).
        const gen = planetGenerator.generate(planet.variant, planet.seed);
        const noAtmo = gen.physics.atmospherePressureAtm < 0.05;
        this.atmosphere = new PlanetAtmosphere(PLANET_RADIUS, gen);
        this.atmosphere.setSunDirection(new THREE.Vector3(1, 0.3, 0.5));
        this.atmosphere.setCloudParams(gen.clouds, gen.anomaly);
        this.atmosphere.setAtmosphereIntensity(noAtmo ? 0 : Math.min(0.65, Math.pow(gen.physics.atmospherePressureAtm / 3, 0.8) * (1 - gen.physics.craters * 0.3)));
        this.atmosphere.setAtmosphereOpacity(0);
        this.atmosphere.setCloudOpacity(0);
        layer.add(this.atmosphere.getObject());
        this.planetLayer = layer;
        this.scene.add(layer);
    }

    /** Направление на солнце: подсветка планеты и атмосферы согласована. */
    public setSunDirection(dir: THREE.Vector3): void {
        const sun = dir.clone().normalize();
        const surface = this.getSurfaceRenderer();
        surface?.setSunDirection(sun);
        this.atmosphere?.setSunDirection(sun);
    }
    public setPlanetOpacity(t: number): void {
        if (this.surfaceRenderer) this.surfaceRenderer.setGlobalOpacity(THREE.MathUtils.clamp(t, 0, 1));
    }
    /** Прозрачность атмосферы и облаков отдельно от рельефа. */
    public setAtmosphereOpacity(atmo: number, clouds: number): void {
        this.atmosphere?.setAtmosphereOpacity(THREE.MathUtils.clamp(atmo, 0, 1.5));
        this.atmosphere?.setCloudOpacity(THREE.MathUtils.clamp(clouds, 0, 1));
    }

    // --- Объёмные облака (пролёт сквозь атмосферу) ---
    public deployClouds(entryPoint: THREE.Vector3, surfaceDir: THREE.Vector3): void {
        this.clouds.deploy(entryPoint, surfaceDir);
    }

    public updateCloudProgress(cameraPos: THREE.Vector3, t: number): void {
        this.clouds.updateProgress(cameraPos, t);
    }

    public retractClouds(): void {
        this.clouds.retract();
    }

    // --- Погода ---
    public setWeather(kind: WeatherKind): void {
        this.weather.setWeather(kind);
    }

    /**
     * TEMP-тумблер панели фильтров: полное отключение погодных частиц.
     * Запоминает желание пользователя и перекрывает автоматические включения
     * (SceneManager включает погоду по типу планеты).
     */
    private weatherEnabled = true;
    public setWeatherEnabled(on: boolean): void {
        this.weatherEnabled = on;
        if (!on) this.weather.setWeather('none');
    }
    public isWeatherEnabled(): boolean {
        return this.weatherEnabled;
    }

    public getSurfaceRenderer(): SurfaceRenderer | null { return this.surfaceRenderer; }
    public getPlanetLayer(): THREE.Group | null { return this.planetLayer; }
    public getPlanetWorldCenter(): THREE.Vector3 {
        return this.planetLayer ? this.planetLayer.position.clone() : new THREE.Vector3();
    }

    // --- Очистка уровней ---
    public hideGalaxy(): void {
        if (this.galaxyLayer) { this.scene.remove(this.galaxyLayer); this.galaxyLayer = null; }
        if (this.systemsRenderer) { this.systemsRenderer.dispose(); this.systemsRenderer = null; }
        if (this.galaxyDust) { this.galaxyDust.dispose(); this.galaxyDust = null; }
        if (this.mortisGalaxy) { this.mortisGalaxy.dispose(); this.mortisGalaxy = null; }
        this.galaxySprite = null;
        this.hideSystem();
    }
    public hideSystem(): void {
        if (this.systemLayer) { this.systemLayer.parent?.remove(this.systemLayer); this.systemLayer = null; }
        if (this.systemRenderer) { this.systemRenderer.dispose(); this.systemRenderer = null; }
        this.galaxySpinEnabled = true;
    }
    public hidePlanet(): void {
        if (this.planetLayer) { this.scene.remove(this.planetLayer); this.planetLayer = null; }
        if (this.surfaceRenderer) { this.surfaceRenderer.dispose(); this.surfaceRenderer = null; }
        if (this.atmosphere) { this.atmosphere.dispose(); this.atmosphere = null; }
    }

    // --- Обновление ---
    public update(dt: number): void {
        this.time += dt;
        if (this.galaxyLayer && this.galaxySpinEnabled) {
            // Диск в плоскости XY => вращение вокруг его нормали (ось Z).
            this.galaxyLayer.rotation.z += this.galaxySpinSpeed * dt;
        }
        // MORTIS-галактика: собственное вращение диска/воронки + мерцание +
        // billboard-разворот туманностей на камеру. Системы лежат внутри слоя
        // галактики, поэтому вращаются вместе с рукавами — не отрываются.
        if (this.mortisGalaxy) this.mortisGalaxy.update(dt);
        if (this.systemRenderer) this.systemRenderer.update(this.time, this.systemCamera ?? undefined, undefined, dt);
        this.atmosphere?.update(dt);
        // Цикл день/ночи: рельеф с колонией вращается, атмосфера неподвижна.
        this.getSurfaceRenderer()?.update(dt);
        // Погода следует за камерой (позиция камеры приходит из SceneManager).
        if (this.weatherCameraPos) this.weather.update(dt, this.weatherCameraPos);
        // Пульс узлов на карте вселенной.
        this.universeRenderer.update(dt);
    }

    public get planetRadius(): number { return PLANET_RADIUS; }

    private makeGalaxySprite(galaxy: Galaxy): THREE.Sprite {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D unavailable.');
        const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        g.addColorStop(0, 'rgba(255,240,210,0.9)');
        g.addColorStop(0.4, 'rgba(160,180,255,0.35)');
        g.addColorStop(1, 'rgba(120,140,220,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 256);
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({
            map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        });
        const sprite = new THREE.Sprite(mat);
        const s = galaxy.radius * 2.6;
        sprite.scale.set(s, s, 1);
        return sprite;
    }
}
