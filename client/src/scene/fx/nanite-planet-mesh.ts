// client/src/scene/fx/nanite-planet-mesh.ts
// НАНИТ-МЕШ ПЛАНЕТЫ (вариант Г: куб-квадтри + cubeDir, юбки корректны).
// Планета = 6 граней куба, каждая рекурсивно делится, пока screenPx > targetPx.
// Каждая вершина несёт (face, uv) грани; шейдер surface считает направление
// через cubeDir(face,uv) => непрерывный узор по всей сфере (нет «каши»).
// Юбки (skirt) гасят геометрические дырки на стыке разноуровневых листьев;
// т.к. цвет считается от cubeDir, шов визуально не виден.

import * as THREE from 'three';

const GRID = 12;
const SKIRT = 0.02;
const MAX_DEPTH = 5;
const MAX_LEAVES = 220;

const LEAF_SIDE = GRID + 1;
const LEAF_VERTS = LEAF_SIDE * LEAF_SIDE + 4 * LEAF_SIDE;
const LEAF_IDX = (() => {
  const seg = GRID, side = LEAF_SIDE, arr: number[] = [];
  for (let iy = 0; iy < seg; iy++) for (let ix = 0; ix < seg; ix++) {
    const a = iy * side + ix, b = a + 1, c = a + side, d = c + 1;
    arr.push(a, b, c, b, d, c);
  }
  const g = (iy: number, ix: number) => iy * side + ix;
  const ss = side * side;
  const strip = (bf: (i: number) => number, base: number) => {
    for (let i = 0; i < seg; i++) {
      const b0 = bf(i), b1 = bf(i + 1), s0 = base + i, s1 = base + i + 1;
      arr.push(b0, s0, b1, b1, s0, s1);
    }
  };
  strip(i => g(0, i), ss);
  strip(i => g(seg, i), ss + side);
  strip(i => g(i, 0), ss + 2 * side);
  strip(i => g(i, seg), ss + 3 * side);
  return new Uint32Array(arr);
})();
const LEAF_TRI = LEAF_IDX.length / 3;

function cubeDir(face: number, u: number, v: number, out: THREE.Vector3): THREE.Vector3 {
  const x = u * 2 - 1, y = v * 2 - 1;
  switch (face) {
    case 0: out.set(1, y, -x); break;
    case 1: out.set(-1, y, x); break;
    case 2: out.set(x, 1, -y); break;
    case 3: out.set(x, -1, y); break;
    case 4: out.set(x, y, 1); break;
    default: out.set(-x, y, -1); break;
  }
  return out.normalize();
}

function buildLeafData(face: number, depth: number, x: number, y: number, radius: number) {
  const seg = GRID, s = 1 / (1 << depth);
  const u0 = x * s, v0 = y * s, u1 = (x + 1) * s, v1 = (y + 1) * s;
  const positions = new Float32Array(LEAF_VERTS * 3);
  const faces = new Float32Array(LEAF_VERTS);
  const uvs = new Float32Array(LEAF_VERTS * 2);
  const lods = new Float32Array(LEAF_VERTS);
  const tmp = new THREE.Vector3();
  const lodV = depth / MAX_DEPTH;
  let i = 0;
  const put = (u: number, v: number, scale: number) => {
    cubeDir(face, u, v, tmp);
    positions[i * 3] = tmp.x * radius * scale;
    positions[i * 3 + 1] = tmp.y * radius * scale;
    positions[i * 3 + 2] = tmp.z * radius * scale;
    faces[i] = face;
    uvs[i * 2] = u; uvs[i * 2 + 1] = v;
    lods[i] = lodV; i++;
  };
  for (let iy = 0; iy < LEAF_SIDE; iy++) {
    const v = v0 + (iy / seg) * (v1 - v0);
    for (let ix = 0; ix < LEAF_SIDE; ix++) {
      const u = u0 + (ix / seg) * (u1 - u0);
      put(u, v, 1);
    }
  }
  for (let ix = 0; ix < LEAF_SIDE; ix++) put(u0 + (ix / seg) * (u1 - u0), v0, 1 - SKIRT);
  for (let ix = 0; ix < LEAF_SIDE; ix++) put(u0 + (ix / seg) * (u1 - u0), v1, 1 - SKIRT);
  for (let iy = 0; iy < LEAF_SIDE; iy++) put(u0, v0 + (iy / seg) * (v1 - v0), 1 - SKIRT);
  for (let iy = 0; iy < LEAF_SIDE; iy++) put(u1, v0 + (iy / seg) * (v1 - v0), 1 - SKIRT);
  return { positions, faces, uvs, lods };
}

export class NanitePlanetMesh {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;
  private radius = 1;
  private targetPx = 120;
  private readonly cache = new Map<number, ReturnType<typeof buildLeafData>>();
  private leaves: Array<{ face: number; depth: number; x: number; y: number; screenPx: number }> = [];
  private lastSignature = '';
  private projFactor = 1080 / (2 * Math.tan((45 * Math.PI) / 360));
  private readonly posArr = new Float32Array(MAX_LEAVES * LEAF_VERTS * 3);
  private readonly faceArr = new Float32Array(MAX_LEAVES * LEAF_VERTS);
  private readonly uvArr = new Float32Array(MAX_LEAVES * LEAF_VERTS * 2);
  private readonly lodArr = new Float32Array(MAX_LEAVES * LEAF_VERTS);
  private readonly idxArr = new Uint32Array(MAX_LEAVES * LEAF_IDX.length);
  private readonly geo: THREE.BufferGeometry;
  private readonly _c = new THREE.Vector3();
  private readonly _corner = new THREE.Vector3();
  private readonly _center = new THREE.Vector3();
  /** Локальный центр листа — копия _center (не мутируется матрицей). */
  private readonly _centerLocal = new THREE.Vector3();
  private readonly _sp = new THREE.Sphere();
  private readonly _m = new THREE.Matrix4();
  private readonly _vp = new THREE.Matrix4();
  private readonly _fr = new THREE.Frustum();

  constructor(material: THREE.ShaderMaterial) {
    this.material = material;
    this.geo = new THREE.BufferGeometry();
    const mk = (a: Float32Array | Uint32Array, n: number) => {
      const b = new THREE.BufferAttribute(a, n); b.setUsage(THREE.DynamicDrawUsage); return b;
    };
    this.geo.setAttribute('position', mk(this.posArr, 3));
    this.geo.setAttribute('aFace', mk(this.faceArr, 1));
    this.geo.setAttribute('aUV', mk(this.uvArr, 2));
    this.geo.setAttribute('aLod', mk(this.lodArr, 1));
    const idx = new THREE.BufferAttribute(this.idxArr, 1);
    idx.setUsage(THREE.DynamicDrawUsage);
    this.geo.setIndex(idx);
    this.geo.setDrawRange(0, 0);
    this.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.frustumCulled = false;
  }

  setRadius(r: number) { this.radius = r; this.cache.clear(); this.lastSignature = '__reset__'; }

  private getLeaf(face: number, depth: number, x: number, y: number) {
    const key = (face << 17) | (depth << 14) | (y << 7) | x;
    let d = this.cache.get(key);
    if (!d) { d = buildLeafData(face, depth, x, y, this.radius); this.cache.set(key, d); }
    return d;
  }

  private visit(
    face: number, depth: number, x: number, y: number,
    camPos: THREE.Vector3, camDir: THREE.Vector3,
  ) {
    const s = 1 / (1 << depth);
    const u0 = x * s, v0 = y * s, u1 = (x + 1) * s, v1 = (y + 1) * s;
    cubeDir(face, (u0 + u1) / 2, (v0 + v1) / 2, this._center);
    let maxAng = 0;
    for (const c of [[u0, v0], [u1, v0], [u0, v1], [u1, v1]] as const) {
      cubeDir(face, c[0], c[1], this._corner);
      const ang = this._corner.angleTo(this._center);
      if (ang > maxAng) maxAng = ang;
    }
    const boundR = Math.sin(maxAng) * 1.15;
    // Центр сферы отсечения — В МИРОВЫХ координатах (умножаем локальный
    // центр листа на мировую матрицу меша), иначе frustum-cull ломается.
    this._centerLocal.copy(this._center).multiplyScalar(this.radius);
    this._sp.center.copy(this._centerLocal).applyMatrix4(this._m);
    this._sp.radius = boundR * this.radius;
    if (!this._fr.intersectsSphere(this._sp)) return;
    const dist = camPos.distanceTo(this._sp.center);
    const screenPx = (boundR * this.radius * this.projFactor) / dist;
    if (depth < MAX_DEPTH && screenPx > this.targetPx && this.leaves.length < MAX_LEAVES) {
      const x2 = x * 2, y2 = y * 2;
      this.visit(face, depth + 1, x2, y2, camPos, camDir);
      this.visit(face, depth + 1, x2 + 1, y2, camPos, camDir);
      this.visit(face, depth + 1, x2, y2 + 1, camPos, camDir);
      this.visit(face, depth + 1, x2 + 1, y2 + 1, camPos, camDir);
      return;
    }
    if (this.leaves.length < MAX_LEAVES) this.leaves.push({ face, depth, x, y, screenPx });
  }

  update(camera: THREE.Camera, projFactor?: number) {
    if (projFactor) this.projFactor = projFactor;
    // Мировая матрица меша планеты (для перевода центров листьев в мир).
    this._m.multiplyMatrices(
      (this.mesh.parent ? this.mesh.parent.matrixWorld : new THREE.Matrix4()),
      this.mesh.matrix,
    );
    // Frustum строится из РЕАЛЬНОЙ view-projection камеры, а не из матрицы
    // модели меша (старый баг: матрица модели ≠ проекция => листья всегда
    // отсекались => поверхность рисовалась пустой, видна была только атмосфера).
    this._vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this._fr.setFromProjectionMatrix(this._vp);
    const camPos = camera.getWorldPosition(new THREE.Vector3());
    const camDir = camPos.clone().normalize();
    this.leaves.length = 0;
    for (let f = 0; f < 6; f++) this.visit(f, 0, 0, 0, camPos, camDir);
    if (this.leaves.length > MAX_LEAVES * 0.95) this.targetPx = Math.min(220, this.targetPx * 1.08);
    else if (this.leaves.length < MAX_LEAVES * 0.5 && this.targetPx > 120) this.targetPx = Math.max(120, this.targetPx * 0.97);

    let sig = '';
    for (const l of this.leaves) sig += ((l.face << 17) | (l.depth << 14) | (l.y << 7) | l.x).toString(36) + ',';
    if (sig !== this.lastSignature) { this.lastSignature = sig; this.fill(); }
  }

  private fill() {
    let vOff = 0, iOff = 0;
    for (const l of this.leaves) {
      const d = this.getLeaf(l.face, l.depth, l.x, l.y);
      this.posArr.set(d.positions, vOff * 3);
      this.faceArr.set(d.faces, vOff);
      this.uvArr.set(d.uvs, vOff * 2);
      this.lodArr.set(d.lods, vOff);
      for (let k = 0; k < LEAF_IDX.length; k++) this.idxArr[iOff + k] = LEAF_IDX[k]! + vOff;
      vOff += LEAF_VERTS; iOff += LEAF_IDX.length;
    }
    for (const name of ['position', 'aFace', 'aUV', 'aLod'] as const) {
      (this.geo.getAttribute(name) as THREE.BufferAttribute | undefined)!.needsUpdate = true;
    }
    (this.geo.getIndex() as THREE.BufferAttribute | undefined)!.needsUpdate = true;
    this.geo.setDrawRange(0, iOff);
  }

  dispose() { this.geo.dispose(); }
}
