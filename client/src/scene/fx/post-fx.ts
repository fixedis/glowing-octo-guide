// client/src/scene/fx/post-fx.ts
import * as THREE from 'three';

const POST_VERT = `
varying vec2 vUv;
void main(){
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

/**
 * Единый проход пост-обработки:
 * - bloom (яркостный порог + размытие в 1 тап по спирали);
 * - хроматическая аберрация (сдвиг RGB-каналов от центра, сила управляется скоростью);
 * - глубина резкости (DoF): размытие растёт с удалением от фокусной дистанции;
 * - виньетка.
 *
 * Сознательно один дешёвый шейдер вместо EffectComposer: без доп. зависимостей,
 * стабильные 60 fps на интегрированной графике, jsdom-совместимость тестов.
 */
export class PostFx {
    private readonly renderer: THREE.WebGLRenderer;
    private readonly scene = new THREE.Scene();
    private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    private readonly material: THREE.ShaderMaterial;
    private readonly rtA: THREE.WebGLRenderTarget;

    /** Сила хроматической аберрации 0..1 (растёт со скоростью перелёта). */
    public aberration = 0;
    /** Сила bloom 0..1 (по умолчанию включён). */
    public bloomStrength = 0.55;
    /**
     * Фокусная глубина в NDC [0..1] и радиус резкости вокруг неё.
     * 1.0 / 0 = DoF выключен (всё резко).
     */
    public focusDepth = 1;
    public focusRange = 0;
    public dofStrength = 0;
    public enabled = true;

    public constructor(renderer: THREE.WebGLRenderer) {
        this.renderer = renderer;
        const size = renderer.getSize(new THREE.Vector2());
        const pr = renderer.getPixelRatio();

        const w = Math.max(2, Math.floor(size.x * pr));
        const h = Math.max(2, Math.floor(size.y * pr));
        this.rtA = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType });
        // DepthTexture для DoF (создаётся после RT, привязывается к нему).
        const depthTexture = new THREE.DepthTexture(w, h);
        depthTexture.type = THREE.UnsignedShortType;
        this.rtA.depthTexture = depthTexture;

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                tDepth: { value: null },
                uAberration: { value: 0 },
                uBloom: { value: this.bloomStrength },
                uAspect: { value: size.x / Math.max(1, size.y) },
                uFocus: { value: this.focusDepth },
                uFocusRange: { value: this.focusRange },
               uDofStrength: { value: this.dofStrength },
            },
            vertexShader: POST_VERT,
            fragmentShader: POST_FRAG,
            depthTest: false,
            depthWrite: false,
        });

        this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));
    }

    public setSize(width: number, height: number): void {
        const pr = this.renderer.getPixelRatio();
        const w = Math.max(2, Math.floor(width * pr));
        const h = Math.max(2, Math.floor(height * pr));
        this.rtA.setSize(w, h);
        if (this.rtA.depthTexture) this.rtA.depthTexture.image.width = w;
        if (this.rtA.depthTexture) this.rtA.depthTexture.image.height = h;
        this.material.uniforms['uAspect']!.value = width / Math.max(1, height);
    }

    /**
     * Включает DoF: фокус на объекте, находящемся в точке target от камеры,
     * range — «толщина» зоны резкости (мировые юниты), strength 0..1.
     */
    public setFocus(camera: THREE.PerspectiveCamera, target: THREE.Vector3, range: number, strength = 1): void {
        const dist = camera.position.distanceTo(target);
        const near = camera.near;
        const far = camera.far;
        // Перевод мировой дистанции в NDC-глубину (как в gl_FragCoord.z).
        // Используем упрощённую линейную аппроксимацию перспективной проекции:
        const ndc = (far + near) / (far - near) - (2 * far * near) / ((far - near) * dist);
        this.focusDepth = THREE.MathUtils.clamp((ndc + 1) / 2, 0, 1);
        // Толщина зоны резкости тоже переводится в NDC-дельту.
        const ndcFar = (far + near) / (far - near) - (2 * far * near) / ((far - near) * (dist + range));
        this.focusRange = Math.abs(this.focusDepth - THREE.MathUtils.clamp((ndcFar + 1) / 2, 0, 1));
        this.dofStrength = strength;
    }

    /** Выключает DoF. */
    public clearFocus(): void {
        this.dofStrength = 0;
    }

    /** Рендерит сцену в RT, затем пост-проход на экран. */
    public render(scene: THREE.Scene, camera: THREE.Camera): void {
        if (!this.enabled) {
            this.renderer.render(scene, camera);
            return;
        }
        this.renderer.setRenderTarget(this.rtA);
        this.renderer.render(scene, camera);
        this.renderer.setRenderTarget(null);

        const u = this.material.uniforms;
        u['tDiffuse']!.value = this.rtA.texture;
        u['tDepth']!.value = this.rtA.depthTexture;
        u['uAberration']!.value = this.aberration;
        u['uBloom']!.value = this.bloomStrength;
        u['uFocus']!.value = this.focusDepth;
        u['uFocusRange']!.value = this.focusRange;
        u['uDofStrength']!.value = this.dofStrength;
        this.renderer.render(this.scene, this.camera);
    }

    public dispose(): void {
        this.rtA.depthTexture?.dispose();
        this.rtA.dispose();
        this.material.dispose();
        (this.scene.children[0] as THREE.Mesh).geometry.dispose();
    }
}

const POST_FRAG = `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform float uAberration;
uniform float uBloom;
uniform float uAspect;
uniform float uFocus;
uniform float uFocusRange;
uniform float uDofStrength;
varying vec2 vUv;

vec3 sampleBright(vec2 uv){
    vec3 c = texture2D(tDiffuse, uv).rgb;
    // Яркостный порог: оставляем только светлые пиксели.
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    return c * smoothstep(0.55, 1.0, l);
}

void main(){
    vec2 center = vUv - 0.5;
    float dist = length(center);

    // --- Хроматическая аберрация: сдвиг каналов от центра ---
    float ab = uAberration * 0.012 * dist;
    vec3 col;
    col.r = texture2D(tDiffuse, vUv + center * ab).r;
    col.g = texture2D(tDiffuse, vUv).g;
    col.b = texture2D(tDiffuse, vUv - center * ab).b;

    // --- Bloom: спиральный тап из 8 сэмплов ---
    if (uBloom > 0.001) {
        vec3 blur = vec3(0.0);
        float radius = max(0.004, 0.010 / max(uAspect, 0.5));
        for (int i = 0; i < 8; i++) {
            float a = float(i) * 0.7853981634; // PI/4
            blur += sampleBright(vUv + vec2(cos(a), sin(a)) * radius);
        }
        col += blur * (uBloom * 0.25);
    }

    // --- DoF: вне зоны фокуса добавляем размытые сэмплы ---
    if (uDofStrength > 0.001) {
        float d = texture2D(tDepth, vUv).r;
        float coc = clamp((abs(d - uFocus) - uFocusRange) * 30.0, 0.0, 1.0) * uDofStrength;
        if (coc > 0.001) {
            vec3 blurCol = vec3(0.0);
            // Круг размытия: 12 сэмплов по двум кольцам.
            for (int i = 0; i < 12; i++) {
                float a = float(i) * 0.5235987755; // PI/6
                vec2 off = vec2(cos(a), sin(a)) * coc * 0.008;
                blurCol += texture2D(tDiffuse, vUv + off).rgb;
                blurCol += texture2D(tDiffuse, vUv + off * 2.2).rgb;
            }
            blurCol /= 24.0;
            col = mix(col, blurCol, coc * 0.85);
        }
    }

    // --- Виньетка ---
    float vig = smoothstep(0.95, 0.35, dist);
    col *= mix(0.75, 1.0, vig);

    gl_FragColor = vec4(col, 1.0);
}`;
