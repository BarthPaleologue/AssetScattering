import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {Scene} from "@babylonjs/core/scene";
import {StandardMaterial} from "@babylonjs/core/Materials/standardMaterial";
import {VertexData} from "@babylonjs/core/Meshes/mesh.vertexData";
import {Matrix, Quaternion, Vector3} from "@babylonjs/core/Maths/math.vector";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";

function triangleArea(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, x3: number, y3: number, z3: number) {
    // use cross product to calculate area of triangle
    const ux = x2 - x1;
    const uy = y2 - y1;
    const uz = z2 - z1;

    const vx = x3 - x1;
    const vy = y3 - y1;
    const vz = z3 - z1;

    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;

    return Math.sqrt(nx * nx + ny * ny + nz * nz) / 2;
}

function triangleAreaFromBuffer(positions: Float32Array, index1: number, index2: number, index3: number) {
    return triangleArea(
        positions[3 * index1 + 0], positions[3 * index1 + 1], positions[3 * index1 + 2],
        positions[3 * index2 + 0], positions[3 * index2 + 1], positions[3 * index2 + 2],
        positions[3 * index3 + 0], positions[3 * index3 + 1], positions[3 * index3 + 2]
    );
}

function randomPointInTriangleFromBuffer(positions: Float32Array, normals: Float32Array, index1: number, index2: number, index3: number) {
    const r1 = Math.random();
    const r2 = Math.random();

    const x1 = positions[3 * index1 + 0];
    const y1 = positions[3 * index1 + 1];
    const z1 = positions[3 * index1 + 2];

    const x2 = positions[3 * index2 + 0];
    const y2 = positions[3 * index2 + 1];
    const z2 = positions[3 * index2 + 2];

    const x3 = positions[3 * index3 + 0];
    const y3 = positions[3 * index3 + 1];
    const z3 = positions[3 * index3 + 2];

    const n1x = normals[3 * index1 + 0];
    const n1y = normals[3 * index1 + 1];
    const n1z = normals[3 * index1 + 2];

    const n2x = normals[3 * index2 + 0];
    const n2y = normals[3 * index2 + 1];
    const n2z = normals[3 * index2 + 2];

    const n3x = normals[3 * index3 + 0];
    const n3y = normals[3 * index3 + 1];
    const n3z = normals[3 * index3 + 2];

    const f1 = (1 - Math.sqrt(r1));
    const f2 = Math.sqrt(r1) * (1 - r2);
    const f3 = Math.sqrt(r1) * r2;

    const x = f1 * x1 + f2 * x2 + f3 * x3;
    const y = f1 * y1 + f2 * y2 + f3 * y3;
    const z = f1 * z1 + f2 * z2 + f3 * z3;

    const nx = f1 * n1x + f2 * n2x + f3 * n3x;
    const ny = f1 * n1y + f2 * n2y + f3 * n3y;
    const nz = f1 * n1z + f2 * n2z + f3 * n3z;

    return [x, y, z, nx, ny, nz];
}

function getTransformationQuaternion(from: Vector3, to: Vector3): Quaternion {
    const rotationAxis = Vector3.Cross(from, to);
    const angle = Math.acos(Vector3.Dot(from, to));
    return Quaternion.RotationAxis(rotationAxis, angle);
}

function scatterInTriangle(chunkPosition: Vector3, n: number, instanceIndex: number, instancesMatrixBuffer: Float32Array, alignedInstancesMatrixBuffer: Float32Array, positions: Float32Array, normals: Float32Array, index1: number, index2: number, index3: number) {
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
        const matrix = Matrix.Compose(
            new Vector3(scaling, scaling, scaling),
            Quaternion.RotationAxis(Vector3.Up(), rotation),
            new Vector3(x, y, z).addInPlace(chunkPosition)
        );

        alignedMatrix.copyToArray(alignedInstancesMatrixBuffer, 16 * instanceIndex);
        matrix.copyToArray(instancesMatrixBuffer, 16 * instanceIndex);

        instanceIndex++;
    }

    return instanceIndex;
}

export class TerrainChunk {
    readonly nbVerticesPerRow: number;
    readonly mesh: Mesh;
    readonly material: StandardMaterial;

    readonly instancesMatrixBuffer: Float32Array;
    readonly alignedInstancesMatrixBuffer: Float32Array;

    constructor(chunkPosition: Vector3, size: number, nbVerticesPerRow: number, scatterPerSquareMeter: number, instanceUp: Vector3 | null, scene: Scene, terrainFunction: (x: number, y: number) => [height: number, gradX: number, gradZ: number] = () => [0, 0, 0]) {
        this.mesh = new Mesh("terrainPatch", scene);
        this.mesh.position = chunkPosition;

        this.material = new StandardMaterial("terrainPatchMaterial", scene);
        this.material.diffuseColor.set(0.02, 0.1, 0.01);
        this.material.specularColor.scaleInPlace(0);
        this.material.wireframe = false;
        this.mesh.material = this.material;

        this.nbVerticesPerRow = nbVerticesPerRow;

        const positions = new Float32Array(this.nbVerticesPerRow * this.nbVerticesPerRow * 3);
        const normals = new Float32Array(this.nbVerticesPerRow * this.nbVerticesPerRow * 3);
        const indices = new Uint32Array((this.nbVerticesPerRow - 1) * (this.nbVerticesPerRow - 1) * 6);

        const flatArea = size * size;
        const maxNbInstances = Math.floor(flatArea * scatterPerSquareMeter * 2.0);
        this.instancesMatrixBuffer = new Float32Array(16 * maxNbInstances);
        this.alignedInstancesMatrixBuffer = new Float32Array(16 * maxNbInstances);

        const stepSize = size / (this.nbVerticesPerRow - 1);

        let indexIndex = 0;
        let instanceIndex = 0;
        let excessInstanceNumber = 0;
        for (let x = 0; x < this.nbVerticesPerRow; x++) {
            for (let y = 0; y < this.nbVerticesPerRow; y++) {
                const index = x * this.nbVerticesPerRow + y;
                const positionX = x * stepSize - size / 2;
                const positionY = y * stepSize - size / 2;

                const [height, gradX, gradZ] = terrainFunction(this.mesh.position.x + positionX, this.mesh.position.z + positionY);

                positions[3 * index + 0] = positionX;
                positions[3 * index + 1] = height;
                positions[3 * index + 2] = positionY;

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
                indices[indexIndex++] = index - this.nbVerticesPerRow - 1;

                const triangleArea1 = triangleAreaFromBuffer(positions, index - 1, index, index - this.nbVerticesPerRow - 1);
                const nbInstances1 = Math.floor(triangleArea1 * scatterPerSquareMeter + excessInstanceNumber);
                excessInstanceNumber = (triangleArea1 * scatterPerSquareMeter + excessInstanceNumber) - nbInstances1;
                instanceIndex = scatterInTriangle(chunkPosition, nbInstances1, instanceIndex, this.instancesMatrixBuffer, this.alignedInstancesMatrixBuffer, positions, normals, index - 1, index, index - this.nbVerticesPerRow - 1);
                if (instanceIndex >= maxNbInstances) {
                    throw new Error("Too many instances");
                }

                indices[indexIndex++] = index;
                indices[indexIndex++] = index - this.nbVerticesPerRow;
                indices[indexIndex++] = index - this.nbVerticesPerRow - 1;

                const triangleArea2 = triangleAreaFromBuffer(positions, index, index - this.nbVerticesPerRow, index - this.nbVerticesPerRow - 1);
                const nbInstances2 = Math.floor(triangleArea2 * scatterPerSquareMeter + excessInstanceNumber);
                excessInstanceNumber = (triangleArea2 * scatterPerSquareMeter + excessInstanceNumber) - nbInstances2;
                instanceIndex = scatterInTriangle(chunkPosition, nbInstances2, instanceIndex, this.instancesMatrixBuffer, this.alignedInstancesMatrixBuffer, positions, normals, index, index - this.nbVerticesPerRow, index - this.nbVerticesPerRow - 1);
                if (instanceIndex >= maxNbInstances) {
                    throw new Error("Too many instances");
                }
            }
        }

        this.instancesMatrixBuffer = this.instancesMatrixBuffer.slice(0, 16 * instanceIndex);
        this.alignedInstancesMatrixBuffer = this.alignedInstancesMatrixBuffer.slice(0, 16 * instanceIndex);

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.normals = normals;

        vertexData.applyToMesh(this.mesh);

        const aggregate = new PhysicsAggregate(this.mesh, PhysicsShapeType.MESH, { mass: 0 }, scene);
    }
}