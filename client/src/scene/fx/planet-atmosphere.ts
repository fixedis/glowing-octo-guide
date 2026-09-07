// client/src/scene/fx/planet-atmosphere.ts
// Атмосфера планеты (вариант из earth_3d.html): три слоя вокруг нанит-меша.
//   1) FS_LOW  — облака (5 типов: none/patchy/global/bands/vortex, полосы
//      газовиков, вихри, дрейф, толщина). Сфера ~1.035R.
//   2) FS_HUR  — ураганы/аномалии. Сфера ~1.055R.
//   3) FS_ATMO — лимб-ореол (аддитивное свечение атмосферы). Сфера ~1.02R.
// Контракт сохранён: getObject/setSunDirection/update/dispose + новые
// setCloudParams/setAtmoIntensity для зум-гашения.

import * as THREE from 'three';
import type { CloudSettings, AnomalySettings } from '../../core/planet-generator.js';
import { GLSL_NOISE } from './glsl/noise.js';
import { GLSL_HURRICANES } from './glsl/hurricanes.js';
import { VS_SIMPLE } from './glsl/shared.js';
import type { GeneratedPlanet } from '../../core/planet-generator.js';

const CLOUD_FRAG = /* glsl */ `
uniform float uTime;uniform vec3 uSunDir;uniform vec3 uCam;uniform float uDrift;
uniform float uCloud;uniform float uCloudType;uniform float uCloudBands;uniform float uCloudVortex;
uniform float uCloudRot;uniform float uCloudThick;
uniform float uOpaque;
uniform vec3 uCloudCol;uniform vec3 uCloudCol2;
uniform float uVortexLat;uniform float uVortexLon;uniform float uVortexSize;uniform float uVortexDrift;
varying vec3 vObj;varying vec3 vWN;varying vec3 vWP;varying vec3 vVN;
${GLSL_NOISE}${GLSL_HURRICANES}
void main(){vec3 d0=normalize(vObj);
  // ВРАЩЕНИЕ СЛОЯ (собственное) + медленная эволюция форм (кипение).
  vec3 d=rotY(d0,uDrift);
  float evol=uTime*0.015;
  vec3 n=normalize(vWN);vec3 sun=normalize(uSunDir);
  float nsd=dot(n,sun);
  float t1=uTime*.01+uCloudRot*uTime;

  // --- МНОГОСЛОЙНЫЙ РЕЛЬЕФ (параллакс => иллюзия глубины) ---
  float base=fbm(d*3.0+vec3(t1*.4,0.,-t1*.3)+uSeed);
  float detail=fbm(d*7.5+vec3(-t1*.6,t1*.2,t1*.5)+uSeed*1.7);
  float fine=fbm(d*16.0+vec3(t1*.9,-t1*.4,0.)+uSeed*2.3);
  // Формы медленно перетекают (кипение) между слоями.
  float field=mix(base,detail,0.45+0.20*sin(evol*1.3));
  field=mix(field,fine,0.25);

  float cov=0.;
  float bandMix=0.;
  float bandShade=1.;
  if(uCloudType<0.5){discard;}
  else if(uCloudType<1.5){            // PATCHY — кучевые, гуще у экватора
    float lat=abs(d0.y);
    float eqBias=smoothstep(0.95,0.10,lat);
    float t0=0.62-0.30*uCloud;
    float c=smoothstep(t0,t0+0.18,field);
    c*=smoothstep(t0-0.10,t0+0.05,fbm(d*22.+vec3(-t1)+uSeed));
    cov=c*(0.55+0.55*eqBias);
  }else if(uCloudType<2.5){          // GLOBAL — сплошной покров с просветами
    float t0=0.50-0.22*uCloud;
    cov=smoothstep(t0,t0+0.22,field);
    cov*=.55+.50*detail;
  }else if(uCloudType<3.5){          // BANDS — газовики, турбулентные полосы
    float lat=asin(clamp(d0.y,-1.,1.));
    float warp=(fbm(d*5.+uSeed)-.5)*.70;
    float latW=lat+warp*.40;
    float bandSpeed=1.0+sin(lat*3.0)*0.5;
    float lon=atan(d.z,d.x)+t1*bandSpeed;
    vec3 dB=vec3(cos(lon)*cos(lat),sin(latW),sin(lon)*cos(lat));
    float stripes=sin(latW*uCloudBands*3.14159+fbm(dB*4.+uSeed)*4.0)*.5+.5;
    stripes=smoothstep(.12,.88,stripes);
    float turb=.55+.45*fbm(dB*9.+vec3(t1*.4)+uSeed);
    float mass=smoothstep(.30,.75,fbm(dB*6.+vec3(t1*.3)+uSeed));
    cov=(mass*.50+stripes*.42*turb)*uCloud;
    cov=min(cov,.82);
    bandShade=mix(.80,1.08,stripes);
    bandMix=stripes;
    if(uCloudVortex>.1){
      float vLon=uVortexLon+uTime*uVortexDrift;
      vec3 vp=normalize(vec3(cos(uVortexLat)*cos(vLon),sin(uVortexLat),cos(uVortexLat)*sin(vLon)));
      float vr=acos(clamp(dot(d,vp),-1.,1.));
      float vortex=smoothstep(uVortexSize,0.,vr)*uCloudVortex;
      cov=max(cov,min(vortex,.9));
    }
  }else{                             // VORTEX — спиральный шторм
    float vLon=uVortexLon+uTime*uVortexDrift;
    vec3 vp=normalize(vec3(cos(uVortexLat)*cos(vLon),sin(uVortexLat),cos(uVortexLat)*sin(vLon)));
    float vr=acos(clamp(dot(d,vp),-1.,1.));
    float up=abs(vp.y)<.93?1.:0.;
    vec3 t=normalize(cross(vec3(up,1.-up,0.),vp));
    vec3 b=cross(vp,t);
    float angle=atan(dot(d,b),dot(d,t))+uTime*.8;
    float spiral=sin(angle*4.-log(vr+.01)*8.)*.5+.5;
    cov=smoothstep(uVortexSize*1.5,0.,vr)*spiral*uCloudVortex*uCloud;
    cov+=smoothstep(uVortexSize*2.,uVortexSize*.5,vr)*.3*uCloud;
  }

  // --- ОБЪЁМ: рельефная высота + самозатенение от солнца ---
  float h=smoothstep(0.45,0.80,field);                 // «высота» облака
  float shade=fbm((d-sun*0.04)*3.0+vec3(t1*.4,0.,-t1*.3)+uSeed);
  float selfShadow=smoothstep(0.35,0.75,shade-field+0.25);
  cov*=uCloudThick;
  cov*=mix(0.65,1.0,selfShadow);                      // объёмная модуляция

  float dl=clamp(nsd*.9+.06,0.,1.);
  float nightF=smoothstep(-.45,.05,nsd);
  vec3 cloudTint=mix(uCloudCol,uCloudCol2,bandMix);
  vec3 colT=mix(vec3(.02,.025,.05),cloudTint*(0.8+0.5*h),dl);
  colT*=.85+.30*smoothstep(.4,.8,field);
  colT*=bandShade;
  colT*=.08+.92*nightF;
  vec3 col=mix(colT,cloudTint*1.15*(0.7+0.6*h),uOpaque);
  float a=mix(cov*.95,1.0,uOpaque);
  if(a<.02)discard;
  vec3 V=normalize(uCam-vWP);
  // Блик подсветки солнцем (дневная сторона).
  col+=cloudTint*vec3(1.,.9,.75)*pow(clamp(dot(V,-sun),0.,1.),4.)*nightF*mix(cov,1.,uOpaque)*.5;
  // Лёгкая подсветка кромки облака (объём по нормали камеры).
  col+=cloudTint*0.15*pow(1.0-abs(dot(n,V)),3.0)*cov;
  gl_FragColor=vec4(tonemap(col),a);}`;

const HUR_FRAG = /* glsl */ `
uniform float uTime;uniform vec3 uSunDir;uniform vec3 uCloudCol;
varying vec3 vObj;varying vec3 vWN;varying vec3 vWP;varying vec3 vVN;
${GLSL_NOISE}${GLSL_HURRICANES}
void main(){vec3 d=normalize(vObj);float a=hurAlpha(d);
  float nsd=dot(normalize(vWN),normalize(uSunDir));
  vec3 col=mix(vec3(.03,.035,.06),uCloudCol*1.1,clamp(nsd*.9+.06,0.,1.));
  col*=.12+.88*smoothstep(-.35,.1,nsd);
  if(a<.02)discard;gl_FragColor=vec4(tonemap(col),a*.95);}`;

const ATMO_FRAG = /* glsl */ `
uniform float uTime;uniform vec3 uSunDir;uniform vec3 uCam;
uniform float uAtmoInt;uniform vec3 uAtmoCol;
varying vec3 vObj;varying vec3 vWN;varying vec3 vWP;varying vec3 vVN;
${GLSL_NOISE}
void main(){vec3 n=normalize(vWN);vec3 v=normalize(uCam-vWP);
  float limb=1.-clamp(dot(n,v),0.,1.);
  vec3 dw=normalize(vWP);vec3 sun=normalize(uSunDir);
  float nd=dot(dw,sun);
  float day=smoothstep(-.2,.4,nd);
  float haze=.8+.2*fbmQ(normalize(vObj)*5.+vec3(uTime*.003)+uSeed);
  vec3 col=uAtmoCol*(pow(limb,6.0)*.16+pow(limb,14.0)*.28)*day*haze*uAtmoInt;
  float rayleigh=pow(1.0-abs(dot(n,sun)),4.0)*day;
  col+=vec3(.35,.45,.60)*rayleigh*.07*uAtmoInt;
  float sunset=pow(1.0-abs(nd),10.0)*smoothstep(-.1,.1,nd);
  col+=vec3(1.,.35,.15)*sunset*uAtmoInt*.25;
  gl_FragColor=vec4(col,1.);}`;

/** Детерминированный xorshift для стартовых параметров урагана (совместим). */
function rngFrom(seed: number): () => number {
    let a = seed >>> 0;
    return (): number => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const CLOUD_TYPE_INDEX: Record<string, number> = {
    none: 0, patchy: 1, global: 2, bands: 3, vortex: 4,
};

/** Множители плотности облаков (юзер: «плотность слабая» -> гуще). */
const CLOUD_DENSITY_BOOST = 1.5;
const CLOUD_THICKNESS_BOOST = 2.4;

export class PlanetAtmosphere {
    private readonly group = new THREE.Group();
    private readonly lowMat: THREE.ShaderMaterial;
    private readonly hurMat: THREE.ShaderMaterial;
    private readonly atmoMat: THREE.ShaderMaterial;
    private readonly disposables: Array<{ dispose(): void }> = [];
    private readonly lowMesh: THREE.Mesh;
    private readonly hurMesh: THREE.Mesh;
    private readonly atmoMesh: THREE.Mesh;
    /** Накопленные углы (рад) — живут отдельно от планеты. */
    private lowSpin = 0;
    private hurSpin = 0;
    /** Абсолютная угловая скорость ОБЛАКОВ (рад/с): в ту же сторону, что
     *  поверхность планеты, но чуть быстрее прежней базы облаков. */
    private readonly cloudSpin: number;
    /** Базовая интенсивность атмосферы (до зум-гашения). */
    private baseAtmoInt = 0;
    /** Базовая толщина облаков (до зум-гашения) — для корректного setCloudOpacity. */
    private baseCloudThick = 0;

    public constructor(
        radius: number,
        gen: GeneratedPlanet,
        /** Угловая скорость осевого вращения поверхности планеты (рад/с). */
        surfaceSpin: number = 0,
        /** Абсолютная угловая скорость ОБЛАКОВ (рад/с): та же сторона, что
         *  поверхность, но чуть быстрее прежней базы облаков. */
        cloudSpin: number = 0.02,
    ) {
        // Облака: та же сторона вращения, что поверхность планеты (cloudSpin).
        this.cloudSpin = cloudSpin;
        this.baseCloudThick = gen.clouds.thickness * CLOUD_THICKNESS_BOOST;
        const rng = rngFrom(gen.meta.seed);
        const cloudCol = new THREE.Color(gen.palette.cloud);
        // Малый отступ от края диска: низкий слой 1.035R, ураганы 1.055R,
        // лимб-ореол 1.02R (без раздувания самой планеты).
        const lowGeo = new THREE.SphereGeometry(radius * 1.035, 48, 32);
        this.lowMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uSeed: { value: new THREE.Vector3(rng() * 200 - 100, rng() * 200 - 100, rng() * 200 - 100) },
                uSunDir: { value: new THREE.Vector3(1, 0.3, 0.5).normalize() },
                uCam: { value: new THREE.Vector3() },
                uDepth: { value: 0.15 },
                uPost: { value: 1 },
                uQ: { value: 2 },
                uDrift: { value: 0 },
                uCloud: { value: gen.clouds.density * CLOUD_DENSITY_BOOST },
                uCloudType: { value: CLOUD_TYPE_INDEX[gen.clouds.type] ?? 1 },
                uCloudBands: { value: gen.clouds.bands },
                uCloudVortex: { value: gen.clouds.vortexIntensity },
                uCloudRot: { value: gen.clouds.rotation },
                uCloudThick: { value: gen.clouds.thickness * CLOUD_THICKNESS_BOOST },
                uOpaque: { value: 0 },
                uCloudCol: { value: cloudCol },
                uCloudCol2: { value: cloudCol.clone().multiplyScalar(0.85) },
                uVortexLat: { value: gen.clouds.vortexLat },
                uVortexLon: { value: gen.clouds.vortexLon },
                uVortexSize: { value: gen.clouds.vortexSize },
                uVortexDrift: { value: gen.clouds.driftSpeed },
                uHurPos: { value: [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0)] },
                uHurInt: { value: [0, 0, 0] },
                uHurSign: { value: [1, 1, 1] },
                uHurRot: { value: [0, 0, 0] },
                uHurD: { value: [0, 0, 0] },
                uHurScale: { value: [1, 1, 1] },
            },
            vertexShader: VS_SIMPLE,
            fragmentShader: CLOUD_FRAG,
            transparent: true,
            depthWrite: false,
            depthTest: false,
        });
        this.lowMesh = new THREE.Mesh(lowGeo, this.lowMat);
        this.lowMesh.renderOrder = 3;
        this.group.add(this.lowMesh);

        const hurGeo = new THREE.SphereGeometry(radius * 1.055, 48, 32);
        this.hurMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uSeed: { value: new THREE.Vector3(rng() * 200 - 100, rng() * 200 - 100, rng() * 200 - 100) },
                uSunDir: { value: new THREE.Vector3(1, 0.3, 0.5).normalize() },
                uDepth: { value: 0.15 },
                uPost: { value: 1 },
                uQ: { value: 2 },
                uCloudCol: { value: cloudCol },
                uHurPos: { value: [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0)] },
                uHurInt: { value: [0, 0, 0] },
                uHurSign: { value: [1, 1, 1] },
                uHurRot: { value: [0, 0, 0] },
                uHurD: { value: [0, 0, 0] },
                uHurScale: { value: [1, 1, 1] },
            },
            vertexShader: VS_SIMPLE,
            fragmentShader: HUR_FRAG,
            transparent: true,
            depthWrite: false,
            depthTest: false,
        });
        this.hurMesh = new THREE.Mesh(hurGeo, this.hurMat);
        this.hurMesh.renderOrder = 4;
        this.group.add(this.hurMesh);

        const atmoGeo = new THREE.SphereGeometry(radius * 1.02, 48, 32);
        this.atmoMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uSeed: { value: new THREE.Vector3(rng() * 200 - 100, rng() * 200 - 100, rng() * 200 - 100) },
                uSunDir: { value: new THREE.Vector3(1, 0.3, 0.5).normalize() },
                uCam: { value: new THREE.Vector3() },
                uDepth: { value: 0.15 },
                uPost: { value: 1 },
                uQ: { value: 2 },
                uAtmoInt: { value: 0 },
                uAtmoCol: { value: cloudCol.clone() },
            },
            vertexShader: VS_SIMPLE,
            fragmentShader: ATMO_FRAG,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
        });
        this.atmoMesh = new THREE.Mesh(atmoGeo, this.atmoMat);
        this.atmoMesh.renderOrder = 2;
        this.group.add(this.atmoMesh);

        this.disposables.push(lowGeo, matProxy(this.lowMat), hurGeo, matProxy(this.hurMat), atmoGeo, matProxy(this.atmoMat));
    }

    public getObject(): THREE.Object3D {
        return this.group;
    }

    public setSunDirection(dir: THREE.Vector3): void {
        (this.lowMat.uniforms['uSunDir']!.value as THREE.Vector3).copy(dir).normalize();
        (this.hurMat.uniforms['uSunDir']!.value as THREE.Vector3).copy(dir).normalize();
        (this.atmoMat.uniforms['uSunDir']!.value as THREE.Vector3).copy(dir).normalize();
    }

    /** Параметры облаков/аномалий (из генератора). */
    public setCloudParams(clouds: CloudSettings, anomaly: AnomalySettings): void {
        this.baseCloudThick = clouds.thickness * CLOUD_THICKNESS_BOOST;
        (this.lowMat.uniforms['uCloud'] as { value: number }).value = clouds.density * CLOUD_DENSITY_BOOST;
        (this.lowMat.uniforms['uCloudType'] as { value: number }).value = CLOUD_TYPE_INDEX[clouds.type] ?? 1;
        (this.lowMat.uniforms['uCloudBands'] as { value: number }).value = clouds.bands;
        (this.lowMat.uniforms['uCloudVortex'] as { value: number }).value = clouds.vortexIntensity;
        (this.lowMat.uniforms['uCloudRot'] as { value: number }).value = clouds.rotation;
        (this.lowMat.uniforms['uCloudThick'] as { value: number }).value = this.baseCloudThick;
        (this.lowMat.uniforms['uVortexLat'] as { value: number }).value = clouds.vortexLat;
        (this.lowMat.uniforms['uVortexLon'] as { value: number }).value = clouds.vortexLon;
        (this.lowMat.uniforms['uVortexSize'] as { value: number }).value = clouds.vortexSize;
        (this.lowMat.uniforms['uVortexDrift'] as { value: number }).value = clouds.driftSpeed;

        // Ураган из аномалии hotspot/rifting, если она задана.
        const useHur = anomaly.type !== 'none' && anomaly.intensity > 0.01;
        const arr = this.hurMat.uniforms['uHurInt']!.value as number[];
        (this.hurMat.uniforms['uHurPos']!.value as THREE.Vector3[])[0]!.set(
            Math.cos(anomaly.lat) * Math.cos(anomaly.lon),
            Math.sin(anomaly.lat),
            Math.cos(anomaly.lat) * Math.sin(anomaly.lon),
        );
        arr[0] = useHur ? anomaly.intensity : 0;
        arr[1] = 0;
        arr[2] = 0;
    }

    /** Базовая интенсивность лимб-ореола (вызывается при постройке). */
    public setAtmosphereIntensity(o: number): void {
        this.baseAtmoInt = Math.max(0, Math.min(1, o));
        (this.atmoMat.uniforms['uAtmoInt'] as { value: number }).value = this.baseAtmoInt;
    }

    /** Зум-гашение орeола (как раньше setAtmosphereOpacity). */
    public setAtmosphereOpacity(o: number): void {
        (this.atmoMat.uniforms['uAtmoInt'] as { value: number }).value = this.baseAtmoInt * Math.max(0, Math.min(1, o));
    }

    /** Прозрачность облаков/ураганов (для слоя системы). */
    public setCloudOpacity(o: number): void {
        const k = Math.max(0, Math.min(1, o));
        // Базовая толщина × коэффициент — БЕЗ накопления при повторных вызовах.
        (this.lowMat.uniforms['uCloudThick'] as { value: number }).value = this.baseCloudThick * k;
    }

    /** Слои крутятся в ту же сторону, что поверхность планеты (cloudSpin),
     *  но чуть быстрее неё; ураганы — тот же знак, ещё быстрее. */
    public update(dt: number): void {
        // Физическое вращение облачного слоя — ЕДИНСТВЕННЫЙ источник вращения.
        // uDrift НЕ трогаем (оставлен 0), иначе двойное вращение (2x speed).
        this.lowSpin += dt * this.cloudSpin;
        this.hurSpin += dt * this.cloudSpin * 1.6;   // ураганы: та же сторона, быстрее
        this.lowMesh.rotation.y = -this.lowSpin;
        this.hurMesh.rotation.y = -this.hurSpin;
        (this.hurMat.uniforms['uTime'] as { value: number }).value += dt;
        (this.lowMat.uniforms['uTime'] as { value: number }).value += dt;
        (this.atmoMat.uniforms['uTime'] as { value: number }).value += dt;
    }

    public dispose(): void {
        for (const d of this.disposables) d.dispose();
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]!);
        }
    }
}

function matProxy(m: THREE.ShaderMaterial): { dispose(): void } {
    return { dispose: (): void => { m.dispose(); } };
}
