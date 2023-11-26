import scatterComputeSource from "./scatter.wgsl";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { ComputeShader } from "@babylonjs/core/Compute/computeShader";
import { Engine } from "@babylonjs/core/Engines/engine";
import { StorageBuffer } from "@babylonjs/core/Buffers/storageBuffer";
import { UniformBuffer } from "@babylonjs/core/Materials/uniformBuffer";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export async function computeScatterPoints(
    vertexData: VertexData,
    position: Vector3,
    area: number,
    nbVerticesPerRow: number,
    scatterPerSquareMeter: number,
    engine: Engine
): Promise<[Float32Array, Float32Array]> {
    const heightMapComputeShader = new ComputeShader(
        "scatter",
        engine,
        { computeSource: scatterComputeSource },
        {
            bindingsMapping: {
                positions: { group: 0, binding: 0 },
                normals: { group: 0, binding: 1 },
                indices: { group: 0, binding: 2 },
                instanceMatrices: { group: 0, binding: 3 },
                alignedInstanceMatrices: { group: 0, binding: 4 },
                instanceCounter: { group: 0, binding: 5 },
                params: { group: 0, binding: 6 }
            }
        }
    );

    const positions = vertexData.positions as Float32Array;
    if (positions === null) throw new Error("Positions are null");

    const normals = vertexData.normals as Float32Array;
    if (normals === null) throw new Error("Normals are null");

    const indices = vertexData.indices as Uint32Array;
    if (indices === null) throw new Error("Indices are null");

    const instanceMatrices = new Float32Array(area * scatterPerSquareMeter * 16 * 2);
    const alignedInstanceMatrices = new Float32Array(area * scatterPerSquareMeter * 16 * 2);

    const positionsBuffer = new StorageBuffer(engine, positions.byteLength);
    positionsBuffer.update(positions);
    heightMapComputeShader.setStorageBuffer("positions", positionsBuffer);

    const normalsBuffer = new StorageBuffer(engine, normals.byteLength);
    normalsBuffer.update(normals);
    heightMapComputeShader.setStorageBuffer("normals", normalsBuffer);

    const indicesBuffer = new StorageBuffer(engine, indices.byteLength);
    indicesBuffer.update(indices);
    heightMapComputeShader.setStorageBuffer("indices", indicesBuffer);

    const instanceMatricesBuffer = new StorageBuffer(engine, instanceMatrices.byteLength);
    instanceMatricesBuffer.update(instanceMatrices);
    heightMapComputeShader.setStorageBuffer("instanceMatrices", instanceMatricesBuffer);

    const alignedInstanceMatricesBuffer = new StorageBuffer(engine, alignedInstanceMatrices.byteLength);
    alignedInstanceMatricesBuffer.update(alignedInstanceMatrices);
    heightMapComputeShader.setStorageBuffer("alignedInstanceMatrices", alignedInstanceMatricesBuffer);

    const instanceCounterBuffer = new StorageBuffer(engine, 4);
    instanceCounterBuffer.update(new Uint32Array([0]));
    heightMapComputeShader.setStorageBuffer("instanceCounter", instanceCounterBuffer);

    const paramsBuffer = new UniformBuffer(engine);

    paramsBuffer.addUniform("scatterPerSquareMeter", 1);
    paramsBuffer.addUniform("nbVerticesPerRow", 1);
    paramsBuffer.addUniform("position", 3);

    paramsBuffer.updateFloat("scatterPerSquareMeter", scatterPerSquareMeter);
    paramsBuffer.updateUInt("nbVerticesPerRow", nbVerticesPerRow);
    paramsBuffer.updateVector3("position", position);
    paramsBuffer.update();

    heightMapComputeShader.setUniformBuffer("params", paramsBuffer);

    return new Promise((resolve, reject) => {
        heightMapComputeShader
            .dispatchWhenReady(nbVerticesPerRow - 1, nbVerticesPerRow - 1, 2)
            .then(async () => {
                try {
                    const [instanceMatricesBufferView, alignedInstanceMatricesBufferView, instanceCounterBufferView] = await Promise.all([
                        instanceMatricesBuffer.read(),
                        alignedInstanceMatricesBuffer.read(),
                        instanceCounterBuffer.read()
                    ]);

                    const instanceMatrices = new Float32Array(instanceMatricesBufferView.buffer);
                    instanceMatricesBuffer.dispose();

                    const alignedInstanceMatrices = new Float32Array(alignedInstanceMatricesBufferView.buffer);
                    alignedInstanceMatricesBuffer.dispose();

                    const instanceCounter = new Uint32Array(instanceCounterBufferView.buffer);
                    instanceCounterBuffer.dispose();

                    // resize the array to the number of instances
                    const resizedInstanceMatrices = instanceMatrices.slice(0, instanceCounter[0] * 16);
                    const resizedAlignedInstanceMatrices = alignedInstanceMatrices.slice(0, instanceCounter[0] * 16);

                    resolve([resizedInstanceMatrices, resizedAlignedInstanceMatrices]);
                } catch (error) {
                    reject(new Error("Error: " + error));
                }
            })
            .catch((error) => {
                reject(new Error("Error: " + error));
            });
    });
}
