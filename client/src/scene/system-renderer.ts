// client/src/scene/system-renderer.ts
//
// Сцена звёздной системы: солнце + планеты на орбитах + окружение-небо (StarDust).
//
// Конвенция (единая со всеми картами, порядок Эйлера ZXY):
//  - система лежит в плоскости XZ («пол»), как карты вселенной и галактики;
//  - в центре сцены одно солнце (эмиссивная сфера);
//  - планеты крутятся по орбитам вокруг солнца (детерминированно от сида);
//  - окружение = небо карты галактики: мерцающие звёзды с палитрой,
//    медленный дрейф неба, цветные туманности (fx/star-dust.ts).

import * as THREE from 'three';
import { StarDust } from './fx/star-dust.js';
import { createStarSurface } from './fx/star-surface.js';
import { createStarCorona, type CoronaPreset } from './fx/star-corona.js';
import { createPlanetSurfaceMaterial, buildSurfaceMaterial } from './fx/planet-surface.js';
import { PlanetAtmosphere } from './fx/planet-atmosphere.js';
import { planetGenerator } from '../core/planet-generator.js';
import { NanitePlanetMesh } from './fx/nanite-planet-mesh.js';
import type { Planet, SpectralType } from '../core/types.js';

const STAR_SIZES: Record<SpectralType, number> = {
    O: 6, B: 5, A: 4.2, F: 3.6, G: 3.2, K: 2.8, M: 2.4,
};

/** Доля радиуса звезды, которую занимает планета (всегда < 1). */
const PLANET_RADIUS_FRACTION: Record<Planet['type'], number> = {
    terran: 0.26,
    ice: 0.24,
    lava: 0.22,
    gas: 0.52,
    moon: 0.15,
};

/** Цвет шарика планеты в сцене системы (согласован с темой типа). */
const PLANET_COLORS: Record<Planet['type'], number> = {
    terran: 0x3f8a4a,
    ice: 0xbcd6ea,
    lava: 0xff5a2a,
    gas: 0xd8a86a,
    moon: 0x9a9a9a,
};

export interface StarInfo {
    readonly spectralType: SpectralType;
    readonly seed: number;
}

interface PlanetHandle {
    readonly planet: Planet;
    /** Радиус орбиты в юнитах сцены (как в SceneManager.enterSystem). */
    readonly orbitRadius: number;
    /** Наклон плоскости орбиты (рад). */
    readonly inclination: number;
    /** Начальная фаза (рад, от сида). */
    readonly phase: number;
    /** Угловая скорость по орбите (рад/с, по 3-му закону Кеплера). */
    readonly omega: number;
    /** Визуальный радиус планеты в юнитах сцены (для кадрирования «на весь экран»). */
    readonly renderRadius: number;
    /** Мировая позиция на орбите — пересчитывается в update(). */
    readonly mesh: THREE.Mesh;
    readonly orbitLine: THREE.LineLoop;
    readonly spinSpeed: number;
    /** Группа, несущая шарик + кольцо (наклон плоскости орбиты). */
    readonly group: THREE.Group;
    /** Шейдерная поверхность планеты (процедурная графика). */
    readonly surfaceMat: THREE.ShaderMaterial;
    /** Куб-квадтри нанит-меша (дробится по screenPx при зуме). */
    readonly nanite: NanitePlanetMesh;
    /** Кольцо газовика (RingGeometry, прозрачный). */
    readonly ring: THREE.Mesh | null;
    /** Группа физического вращения планеты вокруг оси. */
    readonly spinGroup: THREE.Group;
    /** Атмосфера/облака планеты (для покадрового вращения слоёв). */
    readonly atmosphere: PlanetAtmosphere | null;
    /** Отдельная группа облаков: следует за планетой по орбите, но НЕ
     *  наследует осевое вращение поверхности (облака крутятся сами). */
    readonly cloudGroup: THREE.Group;
    /** Нормальная скорость вращения поверхности (рад/с). */
    readonly surfaceSpin: number;
}

export class SystemRenderer {
    private readonly group = new THREE.Group();
    private readonly disposables: Array<{ dispose(): void }> = [];
    private star: THREE.Mesh | null = null;
    /** Шейдерная поверхность звезды (грануляция/поток/лимб — по классу). */
    private starSurface: ReturnType<typeof createStarSurface> | null = null;
    /** Корона: BackSide-оболочка с фреснелем и лучиками на лимбе. */
    private starCorona: ReturnType<typeof createStarCorona> | null = null;
    /** Окружение системы: небо карты галактики (звёзды+дрейф+туманности). */
    private starDust: StarDust | null = null;
    /** Планеты системы на орбитах (кликабельны). */
    private readonly planets: PlanetHandle[] = [];
    /** Каналы прозрачности: слой (перелёты) и зум-гашение солнца отдельно. */
    private sunLayerOpacity = 1;
    private sunZoomFade = 1;
    /** Группа физического вращения звезды + ореола вокруг наклонённой оси. */
    private starSpinGroup: THREE.Group | null = null;
    /** Кватернион наклона оси звезды (из шейдера uTilt). */
    private readonly starTiltQuat = new THREE.Quaternion();
    /** Угловая скорость вращения (рад/с, из uSpinEq шейдера). */
    private starSpinSpeed = 0;

    public constructor(_seedGraph?: unknown) {}

    public getObject(): THREE.Object3D {
        return this.group;
    }

    /** Габарит сцены системы. */
    public getSceneRadius(): number {
        return 20;
    }

    /** Мировая позиция звезды. */
    public getStarWorldPosition(): THREE.Vector3 | null {
        if (!this.star) return null;
        return this.star.getWorldPosition(new THREE.Vector3());
    }

    public setSystem(star: StarInfo, planets: readonly Planet[] = []): void {
        this.dispose();
        this.buildStar(star);
        this.buildPlanets(planets, star.seed);
        // Окружение системы = небо карты галактики: мерцающие звёзды,
        // медленный дрейф, цветные туманности. Детерминировано сидом системы.
        this.starDust = new StarDust(star.seed);
        this.starDust.setOpacity(0);
        this.group.add(this.starDust.getObject());
    }

    /** Детерминированный LCG (как в GodRays/MORTIS). */
    private rng(key: string): () => number {
        let s = 2166136261 >>> 0;
        for (let i = 0; i < key.length; i++) {
            s ^= key.charCodeAt(i);
            s = Math.imul(s, 16777619) >>> 0;
        }
        return (): number => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 0xffffffff;
        };
    }

    public update(time: number, camera?: THREE.Camera, projFactor?: number, dt = 0): void {
        // Направление камера -> солнце (для засветки фона вокруг диска).
        if (camera && this.starDust) {
            const sunWorld = this.star ? this.star.getWorldPosition(new THREE.Vector3()) : this.group.getWorldPosition(new THREE.Vector3());
            const dir = sunWorld.sub(camera.getWorldPosition(new THREE.Vector3()));
            if (dir.lengthSq() > 1e-6) {
                this.starDust.setSunDirection(dir);
            }
        }
        // Небо живёт от накопленного времени кадра (мерцание + дрейф).
        this.starDust?.update(time);
        // Поверхность звезды: кипящая грануляция и поток плазмы.
        this.starSurface?.update(time);
        // Корона: дыхание и лучики.
        this.starCorona?.update(time);
        // Физическое вращение звезды + ореола вокруг наклонённой оси.
        if (this.starSpinGroup) {
            const angle = this.starSpinSpeed * time;
            const spinQ = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 1, 0),
                angle,
            );
            this.starSpinGroup.quaternion.copy(this.starTiltQuat).multiply(spinQ);
        }
        // Планеты: движение по орбитам + собственное вращение.
        const sunWorld = this.star
            ? this.star.getWorldPosition(new THREE.Vector3())
            : this.group.getWorldPosition(new THREE.Vector3());
        // Проекционный фактор: screenPx = boundR*radius*projFactor/dist.
        // Дефолт — под fov 45° и вьюпорт ~1080 (если вызывающий не дал точный).
        const pf = projFactor ?? (1080 / (2 * Math.tan((45 * Math.PI / 180) / 2)));
        for (const h of this.planets) {
            const a = h.phase + h.omega * time;
            h.spinGroup.position.set(
                Math.cos(a) * h.orbitRadius,
                0,
                Math.sin(a) * h.orbitRadius,
            );
            // Физическое вращение планеты вокруг оси (поверхность + кольцо).
            h.spinGroup.rotation.y += h.surfaceSpin;
            // Облака следуют за планетой по орбите, но НЕ крутятся с осью:
            // копируем только позицию, осевой поворот spinGroup не наследуется.
            h.cloudGroup.position.copy(h.spinGroup.position);
            // ВРАЩЕНИЕ ОБЛАЧНЫХ СЛОЁВ (независимое от поверхности).
            h.atmosphere?.update(dt);

            // ОСВЕЩЕНИЕ ОТ СОЛНЦА: нормаль от планеты к солнцу в мире.
            // Шейдер surface считает диффуз по uSunDir -> светит
            // только обращённая к солнцу сторона (юзер).
            const planetWorld = h.spinGroup.getWorldPosition(new THREE.Vector3());
            const toSun = sunWorld.clone().sub(planetWorld).normalize();
            (h.surfaceMat.uniforms['uSunDir']!.value as THREE.Vector3).copy(toSun);

            // НАНИТ: дробим геометрию по screenPx (зум камеры). При подлёте
            // планета становится высокополигональной автоматически.
            if (camera) {
                h.nanite.update(camera, pf);
            }
        }
    }

    public getMeshes(): THREE.Object3D[] {
        return this.planets.map((h) => h.mesh);
    }

    public pickPlanet(object: THREE.Object3D): Planet | null {
        for (const h of this.planets) {
            if (h.mesh === object) return h.planet;
        }
        return null;
    }

    /** Мировая позиция планеты на её текущей орбите (для входа на поверхность). */
    public getPlanetWorldPosition(seed: number): THREE.Vector3 | null {
        for (const h of this.planets) {
            if (h.planet.seed === seed) {
                return h.spinGroup.getWorldPosition(new THREE.Vector3());
            }
        }
        return null;
    }

    /** Визуальный радиус планеты (юниты сцены) — для кадрирования крупным планом. */
    public getPlanetRenderRadius(seed: number): number | null {
        for (const h of this.planets) {
            if (h.planet.seed === seed) {
                return h.renderRadius;
            }
        }
        return null;
    }

    public setGlobalOpacity(opacity: number): void {
        const o = Math.max(0, Math.min(1, opacity));
        this.sunLayerOpacity = o;
        this.applySunOpacity();
        if (this.starDust) this.starDust.setOpacity(o);
        // Планеты следуют за каналом слоя вместе с солнцем.
        for (const h of this.planets) {
            h.mesh.visible = o > 0.005;
            if (h.ring) {
                (h.ring.material as THREE.MeshBasicMaterial).opacity = 0.5 * o;
                h.ring.visible = o > 0.005;
            }
            (h.orbitLine.material as THREE.LineBasicMaterial).opacity = 0.5 * o;
        }
    }

    /** Зум-гашение ТОЛЬКО солнца (планеты и небо не гаснут). */
    public setSunFade(fade: number): void {
        this.sunZoomFade = Math.max(0, Math.min(1, fade));
        this.applySunOpacity();
    }

    /** Применяет каналы прозрачности к солнцу (слой × зум). */
    private applySunOpacity(): void {
        if (!this.star) return;
        const o = this.sunLayerOpacity * this.sunZoomFade;
        // Шейдер читает ТОЛЬКО uOpacity — material.opacity он игнорирует.
        this.starSurface?.setOpacity(o);
        this.starCorona?.setOpacity(o);
        this.star.visible = o > 0.005;
        if (this.starCorona) this.starCorona.mesh.visible = o > 0.005;
    }

    public dispose(): void {
        for (const d of this.disposables) {
            d.dispose();
        }
        this.disposables.length = 0;
        this.star = null;
        this.starSpinGroup = null;
        if (this.starSurface) { this.starSurface.dispose(); this.starSurface = null; }
        if (this.starCorona) { this.starCorona.dispose(); this.starCorona = null; }
        if (this.starDust) { this.starDust.dispose(); this.starDust = null; }
        for (const h of this.planets) {
            h.mesh.geometry.dispose();
            (h.mesh.material as THREE.Material).dispose();
            h.nanite.dispose();
            if (h.ring) {
                h.ring.geometry.dispose();
                (h.ring.material as THREE.Material).dispose();
            }
            h.orbitLine.geometry.dispose();
            (h.orbitLine.material as THREE.Material).dispose();
        }
        this.planets.length = 0;
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]!);
        }
    }

    private track<T extends { dispose(): void }>(d: T): T {
        this.disposables.push(d);
        return d;
    }

    // ---------- Звезда ----------

    private buildStar(star: StarInfo): void {
        // Размер: база по классу × случайный разброс 0.75..1.35 от сида —
        // звёзды одного класса заметно разные (юзер: «размеры рандомны?»).
        const base = STAR_SIZES[star.spectralType] ?? 3;
        const rngSize = this.rng('star/' + star.seed + '/size');
        const size = base * (0.75 + rngSize() * 0.6);

        // КРАСИВОЕ СОЛНЦЕ (юзер): шейдерная поверхность по спектральному
        // классу — грануляция, поток плазмы, лимбное затемнение с ободком,
        // у холодных звёзд вспышки. Без glow-спрайтов (запрет юзера).
        const geo = this.track(new THREE.SphereGeometry(size, 48, 32));
        const surface = createStarSurface(star.spectralType, star.seed);
        this.starSurface = surface;
        const mat = surface.material;
        mat.transparent = true; // прозрачность нужна зум-гашению солнца.
        this.star = new THREE.Mesh(geo, mat);

        // КОРОНА: цвет из rim-палитры класса, сила по классу — у горячих
        // гигантов ореол мощнее. Оболочка 1.28R, additive, НЕ спрайт.
        // Пресет горения собран из эталонов tuner (?tuner=1): ширина 1.28R,
        // тонкие языки, умеренный спад, яркое основание по всему кругу.
        const coronaIntensity =
            { O: 1.5, B: 1.4, A: 1.25, F: 1.1, G: 1.0, K: 0.9, M: 0.8 }[star.spectralType] ?? 1;
        const coronaPreset: CoronaPreset = {
            width: 1.28,
            noiseScale: 3.6,
            flowSpeed: 1.15,
            edgePow: 2.8,
            baseGlow: 1.7,
            tongueGain: 1.9,
            breatheSpeed: 0.7,
            intensity: coronaIntensity,
        };
        this.starCorona = createStarCorona(
            size,
            surface.material.uniforms.uRim!.value as THREE.Color,
            coronaPreset,
        );

        // ФИЗИЧЕСКОЕ ВРАЩЕНИЕ ВОКРУГ ОСИ: звезда + ореол помещаются в
        // группу, наклонённую по оси звезды (uTilt из шейдера), и крутятся
        // как твёрдое тело. Ось и скорость — те же, что раньше считал
        // шейдер (uSpinEq), чтобы не нарушать детерминизм и баланс.
        const u = surface.material.uniforms;
        this.starSpinSpeed = u.uSpinEq!.value as number;
        const tilt = u.uTilt!.value as THREE.Matrix3;
        const e = tilt.elements;
        const m4 = new THREE.Matrix4().set(
            (e[0] ?? 0), (e[3] ?? 0), (e[6] ?? 0), 0,
            (e[1] ?? 0), (e[4] ?? 0), (e[7] ?? 0), 0,
            (e[2] ?? 0), (e[5] ?? 0), (e[8] ?? 0), 0,
            0, 0, 0, 1,
        );
        this.starTiltQuat.setFromRotationMatrix(m4);

        this.starSpinGroup = new THREE.Group();
        this.starSpinGroup.quaternion.copy(this.starTiltQuat);
        this.starSpinGroup.add(this.star);
        this.starSpinGroup.add(this.starCorona.mesh);
        this.group.add(this.starSpinGroup);
    }

    // ---------- Планеты ----------

    private buildPlanets(planets: readonly Planet[], systemSeed: number): void {
        if (planets.length === 0) return;

        // Орбитальный радиус: база от сида (детерминизм), НО разнесён по
        // индексу с гарантированным зазором — иначе все планеты схлопываются
        // у солнца (бэкенд даёт semiMajorAxis шагом ~0.7 ед., а радиусы
        // солнца/планет сопоставимы). Множитель растёт с индексом, поэтому
        // внешние орбиты заметно шире внутренних (как в реальных системах).
        const starR = this.star ? (this.star.geometry as THREE.SphereGeometry).parameters.radius : 3;
        // Накопитель орбиты: стартуем за короной, дальше зазор растёт с
        // радиусом планеты — чем больше тело, тем дальше от него следующая
        // орбита (юзер).
        let cursor = starR + 6;
        const BASE_GAP = 8;
        const SIZE_GAP = 2.6; // множитель радиуса планеты -> зазор

        for (const planet of planets) {
            const rng = this.rng('planet/orbit/' + planet.seed);
            // Радиус планеты (детерминирован) — считаем ДО орбиты, т.к. от
            // него зависит зазор до следующей орбиты (чем больше — тем дальше).
            const renderRadius =
                starR * PLANET_RADIUS_FRACTION[planet.type] * (0.85 + rng() * 0.3);
            const color = PLANET_COLORS[planet.type];

            // Орбита = текущий курсор (накапливается с зазором по размеру
            // планеты). Следующая орбита отодвигается на BASE_GAP + размер
            // этой планеты -> большие тела разносят соседей дальше.
            const orbitRadius = cursor;
            cursor += BASE_GAP + renderRadius * SIZE_GAP;

            // Наклон плоскости орбиты: примерно в ОДНОЙ плоскости
            // (эклиптике XZ), как у реальных планет — до ~7° относительно
            // базовой плоскости. Бэкенд даёт inclinationFixed в диапазоне
            // [0, MAX_INCL], нормализуем к [-MAX_TILT, +MAX_TILT].
            const MAX_INCL = 261_799;
            const MAX_TILT = 0.12; // ~7° — разброс орбит вокруг плоскости XZ.
            const inclNorm = (planet.inclinationFixed ?? 0) / MAX_INCL; // 0..1
            const inclination = (inclNorm - 0.5) * 2 * MAX_TILT;
            const phase = rng() * Math.PI * 2;
            // 3-й закон Кеплера: угловая скорость ∝ a^-1.5. База подобрана
            // низкой — планеты плавно ползут по орбитам. Юзер: ещё в 5 раз
            // медленнее (юзер). Детерминированно.
            const omega = 0.28 / Math.pow(orbitRadius, 1.5) / 3;
            // СОБСТВЕННОЕ ВРАЩЕНИЕ: вольяжно медленное (юзер), ~1 оборот за
            // 1000-2250 с. База малая, разброс небольшой — без резких кручений.
            // Юзер: в 4 раза медленнее по своей оси + ещё в 3 раза медленнее (итого /12).
            const surfaceSpin = (rng() < 0.5 ? -1 : 1) * (0.0028 + rng() * 0.0024) / 4 / 3;
            // ОБЛАКА (юзер): в ту же сторону, что поверхность планеты, но чуть
            // быстрее прежней базы. Направление = знак surfaceSpin; величина
            // остаётся заметной и НЕ привязана к скорости оси (иначе замёрзнут).
            const cloudDir = Math.sign(surfaceSpin);
            const cloudBase = (0.02 + rng() * 0.03) * 1.3;   // чуть быстрее, чем было
            const cloudSpin = cloudDir * cloudBase;

            // КРАСИВАЯ ПЛАНЕТА (нанит-меш): процедурная поверхность по типу
            // (континенты/биомы/льды/лавовые трещины/полосы газовика), день/ночь
            // + огни городов. Геометрия — куб-квадтри, сама дробится при зуме
            // (screenPx), поэтому при подлёте камеры планета становится
            // высокополигональной автоматически. Сервер графику не считает.
            const surfaceRng = this.rng('planet/surface/' + planet.seed);
            const surfaceMat = this.track(buildSurfaceMaterial(planet));
            const nanite = new NanitePlanetMesh(surfaceMat);
            nanite.setRadius(renderRadius);
            const mesh = nanite.mesh;            // THREE.Mesh с куб-квадтри
            mesh.renderOrder = 2;

            // Физическое вращение планеты вокруг наклонённой оси (как твёрдое
            // тело): поверхность + атмосфера + кольцо крутятся вместе.
            const spinGroup = new THREE.Group();
            // Лёгкий наклон оси (детерминирован от сида), чтобы не все «вертикально».
            spinGroup.rotation.z = (rng() - 0.5) * 0.5;
            spinGroup.add(mesh);

            // Отдельная группа облаков: следует за планетой по орбите, но НЕ
            // наследует осевое вращение поверхности (облака крутятся сами).
            const cloudGroup = new THREE.Group();
            // Наклон оси — тот же, что у spinGroup (иначе полосы/вихри
            // смещены относительно экватора поверхности).
            cloudGroup.rotation.z = spinGroup.rotation.z;

            // Атмосфера + облака + лимб-ореол: у всех типов, кроме голого камня (moon).
            // Данные берутся из расширенного генератора по variant планеты.
            let atmosphere: PlanetAtmosphere | null = null;
            if (planet.type !== 'moon') {
                const gen = planetGenerator.generate(planet.variant, planet.seed);
                const noAtmo = gen.physics.atmospherePressureAtm < 0.05;
                atmosphere = new PlanetAtmosphere(renderRadius, gen, surfaceSpin, cloudSpin);
                atmosphere.setSunDirection(new THREE.Vector3(1, 0.3, 0.5));
                atmosphere.setCloudParams(gen.clouds, gen.anomaly);
                atmosphere.setAtmosphereIntensity(
                    noAtmo ? 0 : Math.min(0.65, Math.pow(gen.physics.atmospherePressureAtm / 3, 0.8) * (1 - gen.physics.craters * 0.3)),
                );
                // Облака НЕ в spinGroup: своя группа cloudGroup крутится только
                // своим дрейфом (не наследует осевое вращение поверхности).
                cloudGroup.add(atmosphere.getObject());
            }

            // Кольцо газовика (как в NaniteScene): тонкий прозрачный диск.
            let ring: THREE.Mesh | null = null;
            if (planet.type === 'gas') {
                const ringGeo = this.track(new THREE.RingGeometry(renderRadius * 1.4, renderRadius * 2.2, 64));
                const ringMat = this.track(new THREE.MeshBasicMaterial({
                    color: 0xd8c39a,
                    transparent: true,
                    opacity: 0.5,
                    side: THREE.DoubleSide,
                    depthWrite: false,
                }));
                ring = new THREE.Mesh(ringGeo, ringMat);
                ring.rotation.x = Math.PI / 2; // лежит в плоскости экватора
                spinGroup.add(ring);
            }

            // Кольцо орбиты: тонкий полигон в плоскости XZ, наклонённый.
            const segs = 96;
            const pts: THREE.Vector3[] = [];
            for (let i = 0; i < segs; i++) {
                const t = (i / segs) * Math.PI * 2;
                pts.push(new THREE.Vector3(
                    Math.cos(t) * orbitRadius,
                    0,
                    Math.sin(t) * orbitRadius,
                ));
            }
            const orbitGeo = this.track(new THREE.BufferGeometry().setFromPoints(pts));
            const orbitMat = this.track(new THREE.LineBasicMaterial({
                color: 0x6a7a8a,
                transparent: true,
                opacity: 0.5,
                depthWrite: false,
            }));
            const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);

            // Группа несёт наклон плоскости орбиты (вокруг оси X мира).
            const orbitGroup = new THREE.Group();
            orbitGroup.rotation.x = inclination;
            orbitGroup.add(orbitLine);
            orbitGroup.add(spinGroup);
            orbitGroup.add(cloudGroup);
            this.group.add(orbitGroup);

            this.planets.push({
                planet,
                orbitRadius,
                inclination,
                phase,
                omega,
                renderRadius,
                mesh,
                orbitLine,
                spinSpeed: 0,
                group: orbitGroup,
                surfaceMat,
                ring,
                spinGroup,
                surfaceSpin,
                nanite,
                atmosphere,
                cloudGroup,
            });

            // Первичная расстановка по орбите (до первого update).
            const a0 = phase;
            spinGroup.position.set(
                Math.cos(a0) * orbitRadius,
                0,
                Math.sin(a0) * orbitRadius,
            );
            cloudGroup.position.copy(spinGroup.position);
        }

        // Помечаем сид системы неиспользуемым (детерминизм через planet.seed).
        void systemSeed;
    }
}
