// client/src/scene/fx/galaxy-dust.ts
import * as THREE from 'three';

/**
 * Звёздная пыль рукавов галактики: миллионы частиц (диск + спиральные рукава
 * + балдж), диффузные туманности цветом. Детерминирована от seed галактики.
 */
export class GalaxyDust {
    private readonly points: THREE.Points;
    private readonly material: THREE.PointsMaterial;

    public constructor(
        seed: number,
        radius: number,
        arms = 2,
        count = 12000,
    ) {
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        // Простой детерминированный LCG от seed.
        let s = (seed >>> 0) || 1;
        const rnd = (): number => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 0xffffffff;
        };

        const coreColor = new THREE.Color(0xffe8c0);
        const youngColor = new THREE.Color(0x9fc4ff);
        const oldColor = new THREE.Color(0xffb080);
        const nebulaPink = new THREE.Color(0xff7fb0);
        const nebulaTeal = new THREE.Color(0x6fd8d0);

        for (let i = 0; i < count; i++) {
            const ix = i * 3;
            const roll = rnd();

            if (roll < 0.18) {
                // Балдж: плотное яркое ядро.
                const r = Math.pow(rnd(), 1.6) * radius * 0.16;
                const theta = rnd() * Math.PI * 2;
                const y = (rnd() - 0.5) * radius * 0.06;
                positions[ix] = Math.cos(theta) * r;
                positions[ix + 1] = y;
                positions[ix + 2] = Math.sin(theta) * r;
                coreColor.toArray(colors, ix);
            } else if (roll < 0.9) {
                // Спиральные рукава: логарифмическая спираль с разбросом.
                const arm = Math.floor(rnd() * arms);
                const t = rnd();
                const r = radius * (0.15 + t * 0.85);
                const spiralAngle = t * 4.4 + (arm / arms) * Math.PI * 2;
                const spread = (rnd() - 0.5) * (0.25 + t * 0.55);
                const angle = spiralAngle + spread;
                const thickness = radius * 0.02 * (1 - t * 0.6);
                positions[ix] = Math.cos(angle) * r + (rnd() - 0.5) * radius * 0.03;
                positions[ix + 1] = (rnd() - 0.5) * thickness * 2;
                positions[ix + 2] = Math.sin(angle) * r + (rnd() - 0.5) * radius * 0.03;
                // Молодые голубые ближе к краю, старые красные внутри.
                (t > 0.55 ? youngColor : oldColor).toArray(colors, ix);
            } else {
                // Диффузные туманности: редкие розовые/бирюзовые пятна в рукавах.
                const arm = Math.floor(rnd() * arms);
                const t = 0.3 + rnd() * 0.7;
                const r = radius * (0.2 + t * 0.7);
                const angle = t * 4.4 + (arm / arms) * Math.PI * 2 + (rnd() - 0.5) * 0.35;
                positions[ix] = Math.cos(angle) * r;
                positions[ix + 1] = (rnd() - 0.5) * radius * 0.04;
                positions[ix + 2] = Math.sin(angle) * r;
                (rnd() < 0.5 ? nebulaPink : nebulaTeal).toArray(colors, ix);
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        this.material = new THREE.PointsMaterial({
            size: radius * 0.006,
            vertexColors: true,
            transparent: true,
            opacity: 1,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        this.points = new THREE.Points(geo, this.material);
        // Пыль лежит в плоскости диска галактики (XZ).
        this.points.rotation.x = 0;
    }

    public getObject(): THREE.Object3D {
        return this.points;
    }

    public setOpacity(o: number): void {
        this.material.opacity = THREE.MathUtils.clamp(o, 0, 1);
    }

    public getOpacity(): number {
        return this.material.opacity;
    }

    public dispose(): void {
        this.points.geometry.dispose();
        this.material.dispose();
    }
}
