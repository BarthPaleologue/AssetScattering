import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {Scene} from "@babylonjs/core/scene";
import {StandardMaterial} from "@babylonjs/core/Materials/standardMaterial";
import {VertexData} from "@babylonjs/core/Meshes/mesh.vertexData";
import {Matrix, Quaternion, Vector3} from "@babylonjs/core/Maths/math.vector";

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

function triangleAreaFromBuffer(buffer: Float32Array, index1: number, index2: number, index3: number) {
    return triangleArea(
        buffer[3 * index1 + 0], buffer[3 * index1 + 1], buffer[3 * index1 + 2],
        buffer[3 * index2 + 0], buffer[3 * index2 + 1], buffer[3 * index2 + 2],
        buffer[3 * index3 + 0], buffer[3 * index3 + 1], buffer[3 * index3 + 2]
    );
}

function randomPointInTriangleFromBuffer(buffer: Float32Array, index1: number, index2: number, index3: number) {
    const r1 = Math.random();
    const r2 = Math.random();

    const x1 = buffer[3 * index1 + 0];
    const y1 = buffer[3 * index1 + 1];
    const z1 = buffer[3 * index1 + 2];

    const x2 = buffer[3 * index2 + 0];
    const y2 = buffer[3 * index2 + 1];
    const z2 = buffer[3 * index2 + 2];

    const x3 = buffer[3 * index3 + 0];
    const y3 = buffer[3 * index3 + 1];
    const z3 = buffer[3 * index3 + 2];

    const x = (1 - Math.sqrt(r1)) * x1 + Math.sqrt(r1) * (1 - r2) * x2 + Math.sqrt(r1) * r2 * x3;
    const y = (1 - Math.sqrt(r1)) * y1 + Math.sqrt(r1) * (1 - r2) * y2 + Math.sqrt(r1) * r2 * y3;
    const z = (1 - Math.sqrt(r1)) * z1 + Math.sqrt(r1) * (1 - r2) * z2 + Math.sqrt(r1) * r2 * z3;

    return [x, y, z];
}

export class TerrainPatch {
    readonly nbVerticesPerRow: number;
    readonly mesh: Mesh;
    readonly material: StandardMaterial;
    readonly instancesMatrixBuffer: Float32Array;

    constructor(size: number, nbVerticesPerRow: number, scatterPerSquareMeter: number, scene: Scene) {
        this.mesh = new Mesh("terrainPatch", scene);
        this.material = new StandardMaterial("terrainPatchMaterial", scene);
        this.material.diffuseColor.set(0.05, 0.2, 0.05);
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

        const stepSize = size / (this.nbVerticesPerRow - 1);

        let indexIndex = 0;
        let instanceIndex = 0;
        for (let x = 0; x < this.nbVerticesPerRow; x++) {
            for (let y = 0; y < this.nbVerticesPerRow; y++) {
                const index = x * this.nbVerticesPerRow + y;
                positions[3 * index + 0] = x * stepSize - size / 2;
                positions[3 * index + 1] = Math.cos(x * stepSize * 0.1) * Math.sin(y * stepSize * 0.1) * 3;
                positions[3 * index + 2] = y * stepSize - size / 2;

                normals[3 * index + 0] = 0;
                normals[3 * index + 1] = 1;
                normals[3 * index + 2] = 0;

                if (x == 0 || y == 0) continue;

                indices[indexIndex++] = index - 1;
                indices[indexIndex++] = index;
                indices[indexIndex++] = index - this.nbVerticesPerRow - 1;

                const triangleArea1 = triangleAreaFromBuffer(positions, index - 1, index, index - this.nbVerticesPerRow - 1);
                const nbInstances1 = Math.floor(triangleArea1 * scatterPerSquareMeter);
                for (let i = 0; i < nbInstances1; i++) {
                    if(instanceIndex >= maxNbInstances) {
                        throw new Error("Too many instances");
                    }
                    const [x, y, z] = randomPointInTriangleFromBuffer(positions, index - 1, index, index - this.nbVerticesPerRow - 1);
                    const matrix = Matrix.Compose(
                        new Vector3(1, 1, 1),
                        Quaternion.RotationAxis(Vector3.Up(), Math.random() * 2 * Math.PI),
                        new Vector3(x, y, z)
                    );

                    matrix.copyToArray(this.instancesMatrixBuffer, 16 * instanceIndex);
                    instanceIndex++;
                }

                indices[indexIndex++] = index;
                indices[indexIndex++] = index - this.nbVerticesPerRow;
                indices[indexIndex++] = index - this.nbVerticesPerRow - 1;

                const triangleArea2 = triangleAreaFromBuffer(positions, index, index - this.nbVerticesPerRow, index - this.nbVerticesPerRow - 1);
                const nbInstances2 = Math.floor(triangleArea2 * scatterPerSquareMeter);
                for (let i = 0; i < nbInstances2; i++) {
                    if(instanceIndex >= maxNbInstances) {
                        throw new Error("Too many instances");
                    }
                    const [x, y, z] = randomPointInTriangleFromBuffer(positions, index, index - this.nbVerticesPerRow, index - this.nbVerticesPerRow - 1);
                    const matrix = Matrix.Compose(
                        new Vector3(1, 1, 1),
                        Quaternion.RotationAxis(Vector3.Up(), Math.random() * 2 * Math.PI),
                        new Vector3(x, y, z)
                    );

                    matrix.copyToArray(this.instancesMatrixBuffer, 16 * instanceIndex);
                    instanceIndex++;
                }
            }
        }

        console.log("Number of instances: " + instanceIndex);

        this.instancesMatrixBuffer = this.instancesMatrixBuffer.slice(0, 16 * instanceIndex);

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.normals = normals;

        vertexData.applyToMesh(this.mesh);
    }
}