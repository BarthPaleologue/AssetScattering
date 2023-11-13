import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { randomPointInTriangleFromBuffer, triangleAreaFromBuffer } from "../utils/triangle";
import { getTransformationQuaternion } from "../utils/algebra";
import { createGrassBlade } from "../grass/grassBlade";
import { createGrassMaterial } from "../grass/grassMaterial";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ThinInstancePatch } from "../instancing/thinInstancePatch";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { randomDownSample } from "../utils/matrixBuffer";
import { createTree } from "../utils/tree";

export enum Direction {
    FRONT,
    BACK,
    LEFT,
    RIGHT,
    TOP,
    BOTTOM
}

function rotationFromDirection(direction: Direction) {
    switch (direction) {
        case Direction.BACK:
            return Quaternion.RotationAxis(new Vector3(0, 1, 0), Math.PI);
        case Direction.LEFT:
            return Quaternion.RotationAxis(new Vector3(0, 1, 0), Math.PI / 2);
        case Direction.RIGHT:
            return Quaternion.RotationAxis(new Vector3(0, 1, 0), -Math.PI / 2);
        case Direction.TOP:
            return Quaternion.RotationAxis(new Vector3(1, 0, 0), Math.PI / 2);
        case Direction.BOTTOM:
            return Quaternion.RotationAxis(new Vector3(1, 0, 0), -Math.PI / 2);
        default:
            return Quaternion.Identity();
    }
}

export function createChunk(direction: Direction, planetRadius: number, scene: Scene) {
    const chunk = new Mesh("chunk", scene);

    const nbVerticesPerRow = 64;

    const positions = new Float32Array(nbVerticesPerRow * nbVerticesPerRow * 3);
    const normals = new Float32Array(nbVerticesPerRow * nbVerticesPerRow * 3);
    const indices = new Uint32Array((nbVerticesPerRow - 1) * (nbVerticesPerRow - 1) * 6);

    const size = planetRadius * 2;
    const stepSize = size / (nbVerticesPerRow - 1);

    const scatterPerSquareMeter = 300;

    const flatArea = size * size;
    const maxNbInstances = Math.floor(flatArea * scatterPerSquareMeter * 2.0);
    const instancesMatrixBuffer = new Float32Array(16 * maxNbInstances);
    const alignedInstancesMatrixBuffer = new Float32Array(16 * maxNbInstances);

    const rotationQuaternion = rotationFromDirection(direction);

    const chunkPosition = new Vector3(0, 0, -size / 2);
    const rotatedChunkPosition = chunkPosition.applyRotationQuaternion(rotationQuaternion);

    let indexIndex = 0;
    let instanceIndex = 0;
    let excessInstanceNumber = 0;
    for (let x = 0; x < nbVerticesPerRow; x++) {
        for (let y = 0; y < nbVerticesPerRow; y++) {
            const index = x * nbVerticesPerRow + y;
            const positionX = x * stepSize - size / 2;
            const positionY = y * stepSize - size / 2;
            const positionZ = 0;

            const vertexPosition = chunkPosition.add(new Vector3(positionX, positionY, positionZ));
            vertexPosition.applyRotationQuaternionInPlace(rotationQuaternion);

            const vertexNormalToPlanet = vertexPosition.normalizeToNew();

            vertexPosition.copyFrom(vertexNormalToPlanet.scale(planetRadius));

            const [height, gradient] = terrainFunction(vertexPosition);

            const projectedGradient = gradient.subtract(vertexNormalToPlanet.scale(Vector3.Dot(gradient, vertexNormalToPlanet)));

            vertexPosition.addInPlace(vertexNormalToPlanet.scale(height));
            vertexPosition.subtractInPlace(rotatedChunkPosition);

            positions[3 * index + 0] = vertexPosition.x;
            positions[3 * index + 1] = vertexPosition.y;
            positions[3 * index + 2] = vertexPosition.z;

            const normal = vertexNormalToPlanet.subtract(projectedGradient).normalize();

            normals[3 * index + 0] = normal.x;
            normals[3 * index + 1] = normal.y;
            normals[3 * index + 2] = normal.z;

            if (x == 0 || y == 0) continue;

            indices[indexIndex++] = index - 1;
            indices[indexIndex++] = index;
            indices[indexIndex++] = index - nbVerticesPerRow - 1;

            const triangleArea1 = triangleAreaFromBuffer(positions, index - 1, index, index - nbVerticesPerRow - 1);
            const nbInstances1 = Math.floor(triangleArea1 * scatterPerSquareMeter + excessInstanceNumber);
            excessInstanceNumber = triangleArea1 * scatterPerSquareMeter + excessInstanceNumber - nbInstances1;
            instanceIndex = scatterInTriangle(
                rotatedChunkPosition,
                nbInstances1,
                instanceIndex,
                instancesMatrixBuffer,
                alignedInstancesMatrixBuffer,
                positions,
                normals,
                index - 1,
                index,
                index - nbVerticesPerRow - 1
            );
            if (instanceIndex >= maxNbInstances) {
                throw new Error("Too many instances");
            }

            indices[indexIndex++] = index;
            indices[indexIndex++] = index - nbVerticesPerRow;
            indices[indexIndex++] = index - nbVerticesPerRow - 1;

            const triangleArea2 = triangleAreaFromBuffer(positions, index, index - nbVerticesPerRow, index - nbVerticesPerRow - 1);
            const nbInstances2 = Math.floor(triangleArea2 * scatterPerSquareMeter + excessInstanceNumber);
            excessInstanceNumber = triangleArea2 * scatterPerSquareMeter + excessInstanceNumber - nbInstances2;
            instanceIndex = scatterInTriangle(
                rotatedChunkPosition,
                nbInstances2,
                instanceIndex,
                instancesMatrixBuffer,
                alignedInstancesMatrixBuffer,
                positions,
                normals,
                index,
                index - nbVerticesPerRow,
                index - nbVerticesPerRow - 1
            );
            if (instanceIndex >= maxNbInstances) {
                throw new Error("Too many instances");
            }
        }
    }

    const grassBlade = createGrassBlade(scene, 2);
    grassBlade.isVisible = false;
    const grassMaterial = createGrassMaterial(scene.lights[0] as DirectionalLight, scene);
    grassBlade.material = grassMaterial;

    const patch = new ThinInstancePatch(rotatedChunkPosition, alignedInstancesMatrixBuffer);
    patch.createInstances(grassBlade);

    createTree(scene).then((tree) => {
        tree.isVisible = false;
        const treePatch = new ThinInstancePatch(rotatedChunkPosition, randomDownSample(alignedInstancesMatrixBuffer, 400));
        treePatch.createInstances(tree);
    });

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;

    vertexData.applyToMesh(chunk);

    chunk.position = rotatedChunkPosition;

    return chunk;
}

function terrainFunction(position: Vector3): [height: number, grad: Vector3] {
    const heightMultiplier = 0.2;
    const frequency = 3;
    const height = Math.cos(position.x * frequency) * Math.sin(position.y * frequency) * Math.cos(position.z * frequency) * heightMultiplier;
    const gradX = -Math.sin(position.x * frequency) * Math.sin(position.y * frequency) * Math.cos(position.z * frequency) * frequency * heightMultiplier;
    const gradY = Math.cos(position.x * frequency) * Math.cos(position.y * frequency) * Math.cos(position.z * frequency) * frequency * heightMultiplier;
    const gradZ = Math.cos(position.x * frequency) * Math.sin(position.y * frequency) * Math.sin(position.z * frequency) * frequency * heightMultiplier;

    return [height, new Vector3(gradX, gradY, gradZ)];
}

function scatterInTriangle(
    chunkPosition: Vector3,
    n: number,
    instanceIndex: number,
    instancesMatrixBuffer: Float32Array,
    alignedInstancesMatrixBuffer: Float32Array,
    positions: Float32Array,
    normals: Float32Array,
    index1: number,
    index2: number,
    index3: number
) {
    for (let i = 0; i < n; i++) {
        const [x, y, z, nx, ny, nz] = randomPointInTriangleFromBuffer(positions, normals, index1, index2, index3);
        const alignQuaternion = getTransformationQuaternion(Vector3.Up(), new Vector3(nx, ny, nz));
        const scaling = 0.9 + Math.random() * 0.2;
        const rotation = Math.random() * 2 * Math.PI;
        const alignedMatrix = Matrix.Compose(
            new Vector3(scaling, scaling, scaling),
            alignQuaternion.multiplyInPlace(Quaternion.RotationAxis(Vector3.Up(), rotation)),
            new Vector3(x, y, z).addInPlace(chunkPosition)
        );
        const matrix = Matrix.Compose(new Vector3(scaling, scaling, scaling), Quaternion.RotationAxis(Vector3.Up(), rotation), new Vector3(x, y, z).addInPlace(chunkPosition));

        alignedMatrix.copyToArray(alignedInstancesMatrixBuffer, 16 * instanceIndex);
        matrix.copyToArray(instancesMatrixBuffer, 16 * instanceIndex);

        instanceIndex++;
    }

    return instanceIndex;
}