import scatterComputeSource from "./scatter.wgsl";
import { ComputeShader } from "@babylonjs/core/Compute/computeShader";
import { Engine } from "@babylonjs/core/Engines/engine";
import { StorageBuffer } from "@babylonjs/core/Buffers/storageBuffer";
import { UniformBuffer } from "@babylonjs/core/Materials/uniformBuffer";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export async function computeSquareScatterPoints(
    position: Vector3, size: number, resolution: number,
    engine: Engine
): Promise<Float32Array> {
    const computeShader = new ComputeShader(
        "scatter",
        engine,
        { computeSource: scatterComputeSource },
        {
            bindingsMapping: {
                instanceMatrices: { group: 0, binding: 0 },
                params: { group: 0, binding: 1 }
            }
        }
    );

    const instanceMatrices = new Float32Array(resolution * resolution * 16);

    const instanceMatricesBuffer = new StorageBuffer(engine, instanceMatrices.byteLength);
    instanceMatricesBuffer.update(instanceMatrices);
    computeShader.setStorageBuffer("instanceMatrices", instanceMatricesBuffer);

    const paramsBuffer = new UniformBuffer(engine);

    paramsBuffer.addUniform("size", 1);
    paramsBuffer.addUniform("resolution", 1);
    paramsBuffer.addUniform("position", 3);

    paramsBuffer.updateFloat("size", size);
    paramsBuffer.updateUInt("resolution", resolution);
    paramsBuffer.updateVector3("position", position);
    paramsBuffer.update();

    computeShader.setUniformBuffer("params", paramsBuffer);

    return new Promise((resolve, reject) => {
        computeShader
            .dispatchWhenReady(resolution, resolution, 1)
            .then(async () => {
                try {
                    const [instanceMatricesBufferView] = await Promise.all([
                        instanceMatricesBuffer.read()
                    ]);

                    const instanceMatrices = new Float32Array(instanceMatricesBufferView.buffer);
                    instanceMatricesBuffer.dispose();

                    resolve(instanceMatrices);
                } catch (error) {
                    reject(new Error("Error: " + error));
                }
            })
            .catch((error) => {
                reject(new Error("Error: " + error));
            });
    });
}
