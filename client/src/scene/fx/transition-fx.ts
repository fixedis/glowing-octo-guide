// client/src/scene/fx/transition-fx.ts

/**
 * Полноэкранные эффекты переходов: плазменный вход в атмосферу,
 * вспышка прорыва сквозь облака, вибрация камеры (турбулентность).
 *
 * Реализация — DOM-оверлей поверх канваса (без шейдерного композера),
 * чтобы эффекты не зависели от WebGL-пайплайна и работали в jsdom-тестах.
 */
export class TransitionFx {
    private plasmaEl: HTMLElement | null = null;
    private flashEl: HTMLElement | null = null;
    private fogEl: HTMLElement | null = null;

    /** Плазменное свечение по краям экрана (вход/выход из атмосферы). strength 0..1. */
    public setPlasma(strength: number): void {
        if (typeof document === 'undefined') return;
        const s = Math.max(0, Math.min(1, strength));

        if (s <= 0.001) {
            if (this.plasmaEl) {
                this.plasmaEl.remove();
                this.plasmaEl = null;
            }
            return;
        }

        if (!this.plasmaEl) {
            this.plasmaEl = document.createElement('div');
            this.plasmaEl.style.cssText =
                'position:fixed;inset:0;z-index:90;pointer-events:none;';
            document.body.appendChild(this.plasmaEl);
        }
        // Оранжево-красная кайма по краям, растущая внутрь с силой.
        const inner = (1 - s) * 55;
        this.plasmaEl.style.background =
            `radial-gradient(ellipse at center, ` +
            `rgba(255,120,30,0) ${inner}%, ` +
            `rgba(255,90,20,${0.35 * s}) ${inner + 15}%, ` +
            `rgba(200,40,10,${0.7 * s}) 100%)`;
    }

    /** Короткая вспышка прорыва сквозь облачный слой. */
    public breakthroughFlash(): void {
        if (typeof document === 'undefined') return;

        if (!this.flashEl) {
            this.flashEl = document.createElement('div');
            this.flashEl.style.cssText =
                'position:fixed;inset:0;z-index:95;pointer-events:none;opacity:0;' +
                'background:radial-gradient(circle at 50% 45%,' +
                'rgba(255,255,255,0.95) 0%,rgba(220,235,255,0.6) 45%,rgba(180,210,255,0) 80%);' +
                'transition:opacity 0.25s ease-in;';
            document.body.appendChild(this.flashEl);
        }

        const el = this.flashEl;
        requestAnimationFrame(() => {
            el.style.opacity = '1';
            setTimeout(() => {
                el.style.transition = 'opacity 0.9s ease-out';
                el.style.opacity = '0';
            }, 260);
        });
    }

    /**
     * Атмосферная дымка (плотность атмосферы на экране). 0..1.
     * Используется при входе сквозь облака и для «звукового» ощущения плотности.
     */
    public setAtmosphereHaze(density: number): void {
        if (typeof document === 'undefined') return;
        const d = Math.max(0, Math.min(1, density));

        if (d <= 0.001) {
            if (this.fogEl) {
                this.fogEl.remove();
                this.fogEl = null;
            }
            return;
        }

        if (!this.fogEl) {
            this.fogEl = document.createElement('div');
            this.fogEl.style.cssText =
                'position:fixed;inset:0;z-index:85;pointer-events:none;';
            document.body.appendChild(this.fogEl);
        }
        this.fogEl.style.background =
            `linear-gradient(to bottom, rgba(160,190,230,${0.5 * d}) 0%, rgba(120,150,190,${0.25 * d}) 100%)`;
        this.fogEl.style.backdropFilter = `blur(${(d * 4).toFixed(1)}px)`;
    }

    public clear(): void {
        this.setPlasma(0);
        this.setAtmosphereHaze(0);
    }

    public dispose(): void {
        this.plasmaEl?.remove();
        this.flashEl?.remove();
        this.fogEl?.remove();
        this.plasmaEl = null;
        this.flashEl = null;
        this.fogEl = null;
    }
}
