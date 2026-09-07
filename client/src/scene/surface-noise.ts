// client/src/scene/surface-noise.ts
import * as THREE from 'three';

/** CPU-копия шейдерного шума (SURFACE_VERT/FRAG). Тот же seed => та же суша. */
const fract = (x: number): number => x - Math.floor(x);
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

function hash1(x: number, y: number, z: number): number {
  x = fract(x * 0.1031); y = fract(y * 0.1030); z = fract(z * 0.0973);
  const d = x * (y + 33.33) + y * (x + 33.33) + z * (z + 33.33);
  x += d; y += d; z += d;
  return fract((x + y) * (x + z) * (y + z));
}

function vnoise(x: number, y: number, z: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = fract(x), fy = fract(y), fz = fract(z);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);
  const a = mix(hash1(ix, iy, iz), hash1(ix + 1, iy, iz), ux);
  const b = mix(hash1(ix, iy + 1, iz), hash1(ix + 1, iy + 1, iz), ux);
  const c = mix(hash1(ix, iy, iz + 1), hash1(ix + 1, iy, iz + 1), ux);
  const d = mix(hash1(ix, iy + 1, iz + 1), hash1(ix + 1, iy + 1, iz + 1), ux);
  return mix(mix(a, b, uy), mix(c, d, uy), uz);
}

export function fbm(x: number, y: number, z: number, oct: number): number {
  let amp = 0.5, sum = 0;
  for (let k = 0; k < 7; k++) {
    if (k >= oct) break;
    sum += amp * vnoise(x, y, z);
    x = x * 2.03 + 1.7; y = y * 2.03 + 1.7; z = z * 2.03 + 1.7;
    amp *= 0.5;
  }
  return sum;
}

/** Высота рельефа в направлении dir (та же формула, что в вершинном шейдере). */
export function terrainHeight(dir: THREE.Vector3, seed: THREE.Vector3): number {
  return fbm(dir.x * 3 + seed.x, dir.y * 3 + seed.y, dir.z * 3 + seed.z, 5);
}

/**
 * Ищет направление на поверхности планеты, где СУША (h > sea) И которое
 * обращено к звезде (dot(normal, toStar) > minSun). Детерминированно по seed.
 */
export function findLandDirection(
  seed: THREE.Vector3,
  sea: number,
  toStar: THREE.Vector3,
  minSun = 0.3,
): THREE.Vector3 | null {
  const up = new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3().crossVectors(toStar, up).normalize();
  const base = toStar.clone().normalize();
  // Сканируем конус вокруг направления к звезде.
  for (let ring = 0; ring <= 6; ring++) {
    const polar = (ring / 6) * Math.PI * 0.45;
    for (let seg = 0; seg < 16; seg++) {
      const azim = (seg / 16) * Math.PI * 2;
      const dir = base.clone()
        .add(side.clone().multiplyScalar(Math.tan(polar) * Math.cos(azim)))
        .add(up.clone().multiplyScalar(Math.tan(polar) * Math.sin(azim) * 0.3))
        .normalize();
      if (dir.dot(base) < minSun) continue;
      // Запас +0.02: даже при микро-расхождении CPU/GPU точка точно суша.
      if (terrainHeight(dir, seed) > sea + 0.02) return dir;
    }
  }
  return null;
}
