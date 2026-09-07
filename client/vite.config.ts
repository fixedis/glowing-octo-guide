import http from 'node:http';
import { defineConfig } from 'vitest/config';

// php -S отвечает "Connection: close" и закрывает сокет после каждого ответа.
// Переиспользование keep-alive соединений прокси даёт гонку на протухшем сокете
// => пустой 500 от прокси. Отключаем keep-alive к бэкенду полностью.
const backendAgent = new http.Agent({ keepAlive: false });

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['tests/**/*.test.ts'],
        setupFiles: ['tests/setup.ts'],
    },
    build: {
        rollupOptions: {
            output: {
                // three.js — тяжёлая статическая библиотека, выносим в отдельный
                // чанк: клиентский код обновляется без перекачки three.
                manualChunks: {
                    three: ['three'],
                },
            },
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                agent: backendAgent,
            },
        },
    },
});
