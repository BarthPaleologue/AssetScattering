import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { Observable } from "@babylonjs/core/Misc/observable";
import { randomPointInTriangleFromBuffer, triangleAreaFromBuffer } from "../utils/triangle";
import { getTransformationQuaternion } from "../utils/algebra";
import { computeVertexData } from "../compute/Terrain2dVertexData/computeVertexData";
import { computeScatterPoints } from "../compute/scatterTerrain/computeScatterPoints";

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

export class TerrainChunk {
    readonly size: number;
    readonly nbVerticesPerRow: number;
    readonly mesh: Mesh;
    readonly material: StandardMaterial;

    instancesMatrixBuffer: Float32Array | null = null;
    alignedInstancesMatrixBuffer: Float32Array | null = null;

    private aggregate: PhysicsAggregate | null = null;

    readonly onDisposeObservable = new Observable<TerrainChunk>();

    private readonly scatterPerSquareMeter;
    private readonly terrainFunction: (x: number, y: number) => [height: number, gradX: number, gradZ: number];

    constructor(
        chunkPosition: Vector3,
        size: number,
        nbVerticesPerRow: number,
        scatterPerSquareMeter: number,
        scene: Scene,
        terrainFunction: (x: number, y: number) => [height: number, gradX: number, gradZ: number] = () => [0, 0, 0]
    ) {
        this.mesh = new Mesh("terrainPatch", scene);
        this.mesh.position = chunkPosition;

        this.material = new StandardMaterial("terrainPatchMaterial", scene);
        this.material.diffuseColor.set(0.02, 0.1, 0.01);
        this.material.specularColor.scaleInPlace(0);
        this.material.wireframe = false;
        this.mesh.material = this.material;

        this.size = size;
        this.nbVerticesPerRow = nbVerticesPerRow;

        this.scatterPerSquareMeter = scatterPerSquareMeter;
        this.terrainFunction = terrainFunction;
    }

    async init(scene: Scene): Promise<void> {
        const flatArea = this.size * this.size;

        if (scene.getEngine().getCaps().supportComputeShaders) {
            const vertexData = await computeVertexData(this.nbVerticesPerRow, this.mesh.position, this.size, scene.getEngine());
            vertexData.applyToMesh(this.mesh);
            this.aggregate = new PhysicsAggregate(this.mesh, PhysicsShapeType.MESH, { mass: 0 }, scene);

            [this.instancesMatrixBuffer, this.alignedInstancesMatrixBuffer] = await computeScatterPoints(
                vertexData,
                this.mesh.position,
                flatArea,
                this.nbVerticesPerRow,
                this.scatterPerSquareMeter,
                scene.getEngine()
            );
        } else {
            const positions = new Float32Array(this.nbVerticesPerRow * this.nbVerticesPerRow * 3);
            const normals = new Float32Array(this.nbVerticesPerRow * this.nbVerticesPerRow * 3);
            const indices = new Uint32Array((this.nbVerticesPerRow - 1) * (this.nbVerticesPerRow - 1) * 6);

            const maxNbInstances = Math.floor(flatArea * this.scatterPerSquareMeter * 2.0);
            this.instancesMatrixBuffer = new Float32Array(16 * maxNbInstances);
            this.alignedInstancesMatrixBuffer = new Float32Array(16 * maxNbInstances);

            const stepSize = this.size / (this.nbVerticesPerRow - 1);

            let indexIndex = 0;
            let instanceIndex = 0;
            let excessInstanceNumber = 0;
            for (let x = 0; x < this.nbVerticesPerRow; x++) {
                for (let y = 0; y < this.nbVerticesPerRow; y++) {
                    const index = x * this.nbVerticesPerRow + y;
                    const positionX = x * stepSize - this.size / 2;
                    const positionY = y * stepSize - this.size / 2;

                    const [height, gradX, gradZ] = this.terrainFunction(this.mesh.position.x + positionX, this.mesh.position.z + positionY);

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
                    const nbInstances1 = Math.floor(triangleArea1 * this.scatterPerSquareMeter + excessInstanceNumber);
                    excessInstanceNumber = triangleArea1 * this.scatterPerSquareMeter + excessInstanceNumber - nbInstances1;
                    instanceIndex = scatterInTriangle(
                        this.mesh.position,
                        nbInstances1,
                        instanceIndex,
                        this.instancesMatrixBuffer,
                        this.alignedInstancesMatrixBuffer,
                        positions,
                        normals,
                        index - 1,
                        index,
                        index - this.nbVerticesPerRow - 1
                    );
                    if (instanceIndex >= maxNbInstances) {
                        throw new Error("Too many instances");
                    }

                    indices[indexIndex++] = index;
                    indices[indexIndex++] = index - this.nbVerticesPerRow;
                    indices[indexIndex++] = index - this.nbVerticesPerRow - 1;

                    const triangleArea2 = triangleAreaFromBuffer(positions, index, index - this.nbVerticesPerRow, index - this.nbVerticesPerRow - 1);
                    const nbInstances2 = Math.floor(triangleArea2 * this.scatterPerSquareMeter + excessInstanceNumber);
                    excessInstanceNumber = triangleArea2 * this.scatterPerSquareMeter + excessInstanceNumber - nbInstances2;
                    instanceIndex = scatterInTriangle(
                        this.mesh.position,
                        nbInstances2,
                        instanceIndex,
                        this.instancesMatrixBuffer,
                        this.alignedInstancesMatrixBuffer,
                        positions,
                        normals,
                        index,
                        index - this.nbVerticesPerRow,
                        index - this.nbVerticesPerRow - 1
                    );
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
        }

        this.aggregate = new PhysicsAggregate(this.mesh, PhysicsShapeType.MESH, { mass: 0 }, scene);
    }

    dispose() {
        this.aggregate?.dispose();
        this.mesh.dispose();
        this.onDisposeObservable.notifyObservers(this);
    }
}
