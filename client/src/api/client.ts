// client/src/api/client.ts

import type { ApiResponse } from '../core/types.js';

export interface ApiClientConfig {
    readonly baseUrl: string;
    readonly fetch?: typeof fetch;
}

export class ApiError extends Error {
    public constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/** Пауза между попытками повтора (мс). */
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ApiClient {
    private readonly baseUrl: string;
    private readonly fetch: typeof fetch;

    public constructor(config: ApiClientConfig) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.fetch = config.fetch ?? globalThis.fetch.bind(globalThis);
    }

    public async get<T>(path: string, query?: Record<string, string | number>): Promise<ApiResponse<T>> {
        const url = new URL(this.resolveBase() + path);
        if (query) {
            for (const [k, v] of Object.entries(query)) {
                url.searchParams.set(k, String(v));
            }
        }
        return this.withRetry(async () => {
            const response = await this.fetch(url.toString(), { method: 'GET' });
            return this.handle<T>(response);
        });
    }

    public async post<T>(path: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
        const response = await this.fetch(this.resolveBase() + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        return this.handle<T>(response);
    }

    /**
     * Повтор идемпотентных запросов при сетевых сбоях и ошибках 5xx
     * (однопоточный php -S за прокси иногда рвёт соединение).
     */
    private async withRetry<T>(fn: () => Promise<ApiResponse<T>>): Promise<ApiResponse<T>> {
        const maxAttempts = 3;
        let lastError: unknown;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (err) {
                lastError = err;
                const retryable =
                    err instanceof TypeError ||
                    (err instanceof ApiError && err.status >= 500);
                if (!retryable || attempt === maxAttempts) {
                    break;
                }
                await delay(120 * attempt);
            }
        }

        throw lastError;
    }

    private resolveBase(): string {
        if (this.baseUrl !== '') {
            return this.baseUrl;
        }

        if (typeof window !== 'undefined' && window.location && window.location.origin !== '') {
            return window.location.origin;
        }

        return 'http://localhost';
    }

    private async handle<T>(response: Response): Promise<ApiResponse<T>> {
        let payload: Record<string, unknown> | null = null;
        try {
            payload = (await response.json()) as Record<string, unknown>;
        } catch {
            payload = null;
        }

        if (!response.ok) {
            const message = payload !== null && typeof payload['error'] === 'string'
                ? payload['error']
                : `Request failed with status ${response.status}`;
            throw new ApiError(response.status, message);
        }

        if (payload === null) {
            throw new ApiError(response.status, 'Malformed response body.');
        }

        return payload as unknown as ApiResponse<T>;
    }
}
