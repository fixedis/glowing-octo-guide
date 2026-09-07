// client/src/debug/sun-tuner.ts
//
// TEMP-ИНСТРУМЕНТ (юзер): панель ползунков для живой настройки солнца
// (корона + поверхность). Открывается с ?tuner=1. Кнопка «Копировать»
// выдаёт JSON текущих значений — юзер присылает его обратно, значения
// фиксируются в LOOKS/фабрике короны как эталон.
//
// Панель переживает смену системы: значения хранятся здесь и повторно
// применяются к каждой новой звезде (опрос раз в 400 мс).

import type * as THREE from 'three';
import type { Scene } from 'three';

/** Спецификация одного ползунка. */
interface ParamSpec {
    /** Ключ 'corona.xxx' или 'surface.xxx'. */
    key: string;
    label: string;
    min: number;
    max: number;
    step: number;
}

const PARAMS: readonly ParamSpec[] = [
    // --- Корона ---
    { key: 'corona.width',       label: 'Ширина слоя (R)',      min: 1.02, max: 1.35, step: 0.005 },
    { key: 'corona.noiseScale',  label: 'Мелкость языков',      min: 1.5,  max: 7,    step: 0.05 },
    { key: 'corona.flowSpeed',   label: 'Скорость горения',     min: 0.3,  max: 2.5,  step: 0.05 },
    { key: 'corona.edgePow',     label: 'Профиль спада (pow)',  min: 1.2,  max: 4.5,  step: 0.05 },
    { key: 'corona.baseGlow',    label: 'Основание кольца',     min: 0.5,  max: 3,    step: 0.05 },
    { key: 'corona.tongueGain',  label: 'Сила языков',          min: 0.5,  max: 3,    step: 0.05 },
    { key: 'corona.breatheSpeed',label: 'Частота дыхания',      min: 0.1,  max: 1.5,  step: 0.05 },
    { key: 'corona.intensity',   label: 'Общая интенсивность',  min: 0.2,  max: 3,    step: 0.05 },
    // --- Поверхность ---
    { key: 'surface.spots',      label: 'Пятна (покрытие)',     min: 0,    max: 0.8,  step: 0.01 },
    { key: 'surface.prominences',label: 'Протуберанцы (лимб)',  min: 0,    max: 1.2,  step: 0.02 },
    { key: 'surface.flares',     label: 'Вспышки',              min: 0,    max: 2,    step: 0.05 },
    { key: 'surface.brightness', label: 'Яркость звезды',       min: 0.8,  max: 2.2,  step: 0.02 },
    { key: 'surface.cellScale',  label: 'Мелкость гранул',      min: 1.5,  max: 8,    step: 0.1 },
    { key: 'surface.flowSpeed',  label: 'Течение плазмы',       min: 0.3,  max: 2,    step: 0.05 },
    // Закрутка ЛИНИЙ ПЛАЗМЫ на солнце (дифф. вращение, множитель к базе).
    { key: 'surface.spinMult',   label: 'Закрутка линий ×',     min: 0,    max: 6,    step: 0.05 },
];

/** Текущие значения (стартуют с нейтральных множителей/средних). */
const state = new Map<string, number>();
for (const p of PARAMS) {
    const def =
        p.key === 'corona.width' ? 1.0 : // 1.0 = как построено
        p.key === 'corona.noiseScale' ? 3.6 :
        p.key === 'corona.flowSpeed' ? 1.15 :
        p.key === 'corona.edgePow' ? 2.8 :
        p.key === 'corona.baseGlow' ? 1.7 :
        p.key === 'corona.tongueGain' ? 1.9 :
        p.key === 'corona.breatheSpeed' ? 0.7 :
        p.key === 'corona.intensity' ? 1.0 : // 1.0 = множитель к классу
        p.key === 'surface.spots' ? -1 :      // -1 = «как есть по классу», не трогать
        p.key === 'surface.prominences' ? -1 :
        p.key === 'surface.flares' ? -1 :
        p.key === 'surface.brightness' ? -1 :
        p.key === 'surface.cellScale' ? -1 :
        p.key === 'surface.flowSpeed' ? -1 :
        p.key === 'surface.spinMult' ? 1 : 1;
    state.set(p.key, def);
}

interface SceneMgrLike {
    getScene(): Scene;
    /** Мир литой сцены (для спирали галактики) — может отсутствовать. */
    world?: { setSpinMultiplier?(m: number): void } | undefined;
}

let lastStar: THREE.Mesh | null = null;
let lastCorona: THREE.Mesh | null = null;

function findSun(scene: THREE.Scene): { star: THREE.Mesh | null; corona: THREE.Mesh | null } {
    let star: THREE.Mesh | null = null;
    let corona: THREE.Mesh | null = null;
    scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || !mesh.material || !('uniforms' in mesh.material)) return;
        const u = (mesh.material as THREE.ShaderMaterial).uniforms;
        if (!corona && u['uEdgeGain']) corona = mesh;
        if (!star && u['uCellScale']) star = mesh;
    });
    return { star, corona };
}

/** Применяет все значения к найденной паре звезда/корона. */
function applyAll(scene: Scene, sm?: SceneMgrLike): void {
    const { star, corona } = findSun(scene);
    lastStar = star;
    lastCorona = corona;
    if (corona) {
        const u = (corona.material as THREE.ShaderMaterial).uniforms;
        const setN = (name: string, key: string, mult = false): void => {
            const uni = u[name];
            if (!uni) return;
            const v = state.get(key) ?? 0;
            if (mult && (v <= 0)) return; // «как есть»
            uni.value = mult ? (uni.value as number) * 0 + v : v;
        };
        setN('uNoiseScale', 'corona.noiseScale');
        setN('uFlowSpeed', 'corona.flowSpeed');
        setN('uEdgePow', 'corona.edgePow');
        setN('uBaseGlow', 'corona.baseGlow');
        setN('uTongueGain', 'corona.tongueGain');
        setN('uBreatheSpeed', 'corona.breatheSpeed');
        // Интенсивность: слайдер = МНОЖИТЕЛЬ к классовой базе. База неизвестна
        // после перезаписи, поэтому храним базу при первом касании.
        const iUni = u['uIntensity'];
        if (iUni) {
            const k = '__baseIntensity';
            const w = window as unknown as Record<string, unknown>;
            if (!(k in w)) w[k] = iUni.value;
            const m = state.get('corona.intensity') ?? 1;
            if (m > 0) iUni.value = (w[k] as number) * m;
        }
        // Ширина: абсолютный фактор радиуса звезды.
        if (star) {
            const geoR = (corona.geometry as THREE.SphereGeometry).parameters.radius;
            const starR = (star.geometry as THREE.SphereGeometry).parameters.radius;
            const built = geoR / Math.max(1e-6, starR);
            const desired = state.get('corona.width') ?? 1.0;
            if (desired > 0) corona.scale.setScalar(desired / built);
        }
    }
    if (star) {
        const su = ((star.material as THREE.ShaderMaterial).uniforms);
        const setIf = (name: string, key: string): void => {
            const v = state.get(key) ?? -1;
            if (v >= 0 && su[name]) su[name]!.value = v;
        };
        setIf('uSpots', 'surface.spots');
        setIf('uProminences', 'surface.prominences');
        setIf('uFlares', 'surface.flares');
        setIf('uBrightness', 'surface.brightness');
        setIf('uCellScale', 'surface.cellScale');
        setIf('uFlowSpeed', 'surface.flowSpeed');
        // Закрутка линий плазмы: множитель к пер-звёздной базе uSpinEq
        // (база запоминается при первом касании, знак направления живёт в ней).
        const spinUni = su['uSpinEq'];
        if (spinUni) {
            const w = window as unknown as Record<string, unknown>;
            const k = '__baseSpin_' + (star.uuid);
            if (!(k in w)) w[k] = spinUni.value;
            const m = state.get('surface.spinMult') ?? 1;
            if (m > 0) spinUni.value = (w[k] as number) * m;
        }
    }
}

export function mountSunTuner(getSm: () => SceneMgrLike | null): void {
    const panel = document.createElement('div');
    panel.id = 'sun-tuner';
    panel.style.cssText = [
        'position:fixed', 'top:64px', 'right:8px', 'z-index:20',
        'background:rgba(8,14,10,0.93)', 'border:1px solid #2f5a34',
        'border-radius:6px', 'padding:10px 12px', 'width:270px',
        'font:11px monospace', 'color:#bfe8bf', 'max-height:88vh', 'overflow:auto',
    ].join(';');

    const title = document.createElement('div');
    title.textContent = '☀ SUN TUNER (temp)';
    title.style.cssText = 'font-weight:bold;margin-bottom:6px;color:#ffe08a;';
    panel.appendChild(title);

    const rows = new Map<string, HTMLInputElement>();
    for (const p of PARAMS) {
        const row = document.createElement('div');
        row.style.marginBottom = '4px';
        const lab = document.createElement('label');
        lab.style.cssText = 'display:flex;justify-content:space-between;';
        const name = document.createElement('span');
        name.textContent = p.label;
        const val = document.createElement('span');
        val.style.color = '#ffe08a';
        lab.append(name, val);
        const input = document.createElement('input');
        input.type = 'range';
        input.min = String(p.min);
        input.max = String(p.max);
        input.step = String(p.step);
        input.value = String(state.get(p.key));
        val.textContent = input.value;
        input.addEventListener('input', () => {
            const v = Number(input.value);
            state.set(p.key, v);
            val.textContent = String(v);
            const sm = getSm();
            if (sm) applyAll(sm.getScene(), sm);
            refreshJson();
        });
        rows.set(p.key, input);
        row.append(lab, input);
        panel.appendChild(row);
    }

    const jsonBox = document.createElement('textarea');
    jsonBox.readOnly = true;
    jsonBox.style.cssText = 'width:100%;height:90px;margin-top:6px;background:#06110a;color:#9fe89f;border:1px solid #2f5a34;font:10px monospace;';
    panel.appendChild(jsonBox);

    const refreshJson = (): void => {
        const obj: Record<string, Record<string, number>> = {};
        for (const p of PARAMS) {
            const [group, name] = p.key.split('.');
            if (!group || !name) continue;
            (obj[group] ??= {})[name] = state.get(p.key) ?? 0;
        }
        jsonBox.value = JSON.stringify(obj);
    };

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:6px;margin-top:6px;';
    const mkBtn = (text: string, onClick: () => void): HTMLButtonElement => {
        const b = document.createElement('button');
        b.textContent = text;
        b.style.cssText = 'flex:1;background:#12301a;color:#bfe8bf;border:1px solid #2f5a34;border-radius:4px;padding:4px;font:11px monospace;cursor:pointer;';
        b.addEventListener('click', onClick);
        return b;
    };
    const status = document.createElement('span');
    status.style.color = '#ffe08a';
    btnRow.append(
        mkBtn('Копировать', () => {
            refreshJson();
            const text = jsonBox.value;
            const done = (): void => { status.textContent = ' ✓ скопировано'; setTimeout(() => { status.textContent = ''; }, 1500); };
            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(text).then(done).catch(() => { jsonBox.select(); document.execCommand('copy'); done(); });
            } else {
                jsonBox.select();
                document.execCommand('copy');
                done();
            }
        }),
        mkBtn('Сброс', () => {
            location.reload();
        }),
    );
    panel.appendChild(btnRow);
    panel.appendChild(status);
    refreshJson();
    document.body.appendChild(panel);

    // Повторное применение при смене системы (новая пара мешей) + старт.
    setInterval(() => {
        const sm = getSm();
        if (!sm) return;
        const { star, corona } = findSun(sm.getScene());
        if (star !== lastStar || corona !== lastCorona) {
            applyAll(sm.getScene(), sm);
        }
    }, 400);

    (window as unknown as Record<string, unknown>)['__sunTuner'] = {
        set: (key: string, v: number): void => {
            state.set(key, v);
            const input = rows.get(key);
            if (input) { input.value = String(v); input.dispatchEvent(new Event('input')); }
        },
        state,
    };
}
