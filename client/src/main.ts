// client/src/main.ts

import { ApiClient } from './api/client.js';
import { UniverseClient } from './api/universe-client.js';
import { UniverseApp } from './app/universe-app.js';
import { mountSunTuner } from './debug/sun-tuner.js';

const seedParam = new URLSearchParams(window.location.search).get('seed');
const universeSeed = seedParam ? Number.parseInt(seedParam, 10) : 1337;

const container = document.getElementById('app');
if (!container) {
    throw new Error('Container #app not found.');
}

const api = new ApiClient({ baseUrl: '' });
const client = new UniverseClient(api);

// TEMP: тюнер солнца — только с ?tuner=1 (юзер просит панель ползунков).
if (new URLSearchParams(window.location.search).has('tuner')) {
    void import('./debug/sun-tuner.js').then(({ mountSunTuner }) => {
        // SceneManager живёт внутри UniverseApp; достаём через debug-хук.
        const wait = (): void => {
            const w = window as unknown as Record<string, unknown>;
            const uni = w['__uni'] as { sm?: { getScene(): import('three').Scene; world?: { setSpinMultiplier?(m: number): void } } } | undefined;
            if (uni?.sm) {
                mountSunTuner(() => ({ getScene: () => uni.sm!.getScene(), world: uni.sm!.world }));
            } else {
                setTimeout(wait, 300);
            }
        };
        wait();
    });
}

new UniverseApp({
    container,
    universeSeed,
    client,
});
