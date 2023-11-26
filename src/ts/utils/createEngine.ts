import { Engine } from "@babylonjs/core/Engines/engine";
import { WebGPUEngine } from "@babylonjs/core/Engines";

export async function createEngine(canvas: HTMLCanvasElement): Promise<Engine> {
    if (window.location.href.includes("?webgpu")) {
        if (!WebGPUEngine.IsSupportedAsync) {
            throw new Error("WebGPU is not supported on this device");
        }
        console.log("BACKEND: WebGPU");
        const engine = new WebGPUEngine(canvas);
        await engine.initAsync();
        return engine;
    } else if (window.location.href.includes("?webgl")) {
        console.log("BACKEND: WebGL");
        return new Engine(canvas, true);
    }

    console.log("DEFAULT BACKEND: WebGL");
    return new Engine(canvas);
}
