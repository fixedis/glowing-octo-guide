// client/tests/setup.ts
// jsdom возвращает null из canvas.getContext('2d') без node-canvas.
// Стабизируем 2D-контекст, чтобы процедурные текстуры рендереров не падали в тестах.

class CanvasRenderingContext2DStub {
    public fillStyle = '';
    public strokeStyle = '';
    public font = '';
    public textAlign = '';
    public textBaseline = '';
    public lineWidth = 1;
    public canvas: HTMLCanvasElement | null = null;

    public clearRect(): void {}
    public fillRect(): void {}
    public save(): void {}
    public restore(): void {}
    public translate(): void {}
    public rotate(): void {}
    public scale(): void {}
    public beginPath(): void {}
    public moveTo(): void {}
    public lineTo(): void {}
    public stroke(): void {}
    public fillText(): void {}
    public globalCompositeOperation = '';
    public globalAlpha = 1;
    public createLinearGradient(..._args: unknown[]): { addColorStop(): void } {
        return { addColorStop: (): void => {} };
    }
    public createRadialGradient(..._args: unknown[]): { addColorStop(): void } {
        return { addColorStop: (): void => {} };
    }
}

const originalGetContext: typeof HTMLCanvasElement.prototype.getContext =
    HTMLCanvasElement.prototype.getContext;

HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    contextId: string,
): RenderingContext | null {
    if (contextId === '2d') {
        const stub = new CanvasRenderingContext2DStub();
        stub.canvas = this;
        return stub as unknown as RenderingContext;
    }
    return originalGetContext.call(this, contextId);
} as typeof HTMLCanvasElement.prototype.getContext;
