import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";

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

    const nbVerticesPerRow = 10;

    const positions = new Float32Array(nbVerticesPerRow * nbVerticesPerRow * 3);
    const normals = new Float32Array(nbVerticesPerRow * nbVerticesPerRow * 3);
    const indices = new Uint32Array((nbVerticesPerRow - 1) * (nbVerticesPerRow - 1) * 6);

    const size = planetRadius * 2;
    const stepSize = size / (nbVerticesPerRow - 1);

    const rotationQuaternion = rotationFromDirection(direction);

    const chunkPosition = new Vector3(0, 0, size / 2);
    const rotatedChunkPosition = chunkPosition.applyRotationQuaternion(rotationQuaternion);

    let indexIndex = 0;
    for (let x = 0; x < nbVerticesPerRow; x++) {
        for (let y = 0; y < nbVerticesPerRow; y++) {
            const index = x * nbVerticesPerRow + y;
            const positionX = x * stepSize - size / 2;
            const positionY = y * stepSize - size / 2;
            const positionZ = 0;

            const vertexPosition = chunkPosition.add(new Vector3(positionX, positionY, positionZ));
            vertexPosition.applyRotationQuaternionInPlace(rotationQuaternion);

            vertexPosition.normalize().scaleInPlace(planetRadius);

            // rotate the shit out of it

            const [height, gradX, gradZ] = [0, 0, 0]; //terrainFunction(chunk.position.x + positionX, this.mesh.position.z + positionY);

            vertexPosition.subtractInPlace(rotatedChunkPosition);

            positions[3 * index + 0] = vertexPosition.x;
            positions[3 * index + 1] = vertexPosition.y;
            positions[3 * index + 2] = vertexPosition.z;

            const normalX = -gradX;
            const normalY = 1;
            const normalZ = -gradZ;
            const normalLength = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);

            normals[3 * index + 0] = normalX / normalLength;
            normals[3 * index + 1] = normalY / normalLength;
            normals[3 * index + 2] = normalZ / normalLength;

            if (x == 0 || y == 0) continue;

            indices[indexIndex++] = index - 1;
            indices[indexIndex++] = index;
            indices[indexIndex++] = index - nbVerticesPerRow - 1;

            indices[indexIndex++] = index;
            indices[indexIndex++] = index - nbVerticesPerRow;
            indices[indexIndex++] = index - nbVerticesPerRow - 1;
        }
    }

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;

    vertexData.applyToMesh(chunk);

    chunk.position = rotatedChunkPosition;

    return chunk;
}