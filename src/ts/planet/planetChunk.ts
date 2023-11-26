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
import { downSample } from "../utils/matrixBuffer";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { InstancePatch } from "../instancing/instancePatch";
import { computeVertexData } from "../compute/Terrain3dVertexData/computeVertexData";
import { computeScatterPoints } from "../compute/scatterTerrain/computeScatterPoints";

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

export class PlanetChunk {
    readonly mesh: Mesh;
    instancesMatrixBuffer: Float32Array | null = null;
    alignedInstancesMatrixBuffer: Float32Array | null = null;

    private readonly nbVerticesPerRow = 64;
    private readonly size: number;
    private readonly scatterPerSquareMeter = 300;
    private readonly direction: Direction;

    private vertexData: VertexData | null = null;

    constructor(direction: Direction, planetRadius: number, scene: Scene) {
        this.mesh = new Mesh("chunk", scene);
        this.size = planetRadius * 2;
        this.direction = direction;
    }

    async init(scene: Scene) {
        if (scene.getEngine().getCaps().supportComputeShaders) {
            const vertexData = await computeVertexData(this.nbVerticesPerRow, this.mesh.position, rotationFromDirection(this.direction), this.size, scene.getEngine());
            vertexData.applyToMesh(this.mesh);
            this.vertexData = vertexData;
        } else {
            const positions = new Float32Array(this.nbVerticesPerRow * this.nbVerticesPerRow * 3);
            const normals = new Float32Array(this.nbVerticesPerRow * this.nbVerticesPerRow * 3);
            const indices = new Uint32Array((this.nbVerticesPerRow - 1) * (this.nbVerticesPerRow - 1) * 6);

            const flatArea = this.size * this.size;
            const maxNbInstances = Math.floor(flatArea * this.scatterPerSquareMeter * 2.0);
            this.instancesMatrixBuffer = new Float32Array(16 * maxNbInstances);
            this.alignedInstancesMatrixBuffer = new Float32Array(16 * maxNbInstances);

            const rotationQuaternion = rotationFromDirection(this.direction);

            const chunkPosition = new Vector3(0, 0, -this.size / 2);
            const rotatedChunkPosition = chunkPosition.applyRotationQuaternion(rotationQuaternion);

            this.mesh.position = rotatedChunkPosition;

            const stepSize = this.size / (this.nbVerticesPerRow - 1);
            let indexIndex = 0;
            let instanceIndex = 0;
            let excessInstanceNumber = 0;
            for (let x = 0; x < this.nbVerticesPerRow; x++) {
                for (let y = 0; y < this.nbVerticesPerRow; y++) {
                    const index = x * this.nbVerticesPerRow + y;
                    const positionX = x * stepSize - this.size / 2;
                    const positionY = y * stepSize - this.size / 2;
                    const positionZ = 0;

                    const vertexPosition = chunkPosition.add(new Vector3(positionX, positionY, positionZ));
                    vertexPosition.applyRotationQuaternionInPlace(rotationQuaternion);

                    const vertexNormalToPlanet = vertexPosition.normalizeToNew();

                    vertexPosition.copyFrom(vertexNormalToPlanet.scale(this.size / 2));

                    const [height, gradient] = terrainFunction(vertexPosition);

                    const projectedGradient = gradient.subtract(vertexNormalToPlanet.scale(Vector3.Dot(gradient, vertexNormalToPlanet)));

                    vertexPosition.addInPlace(vertexNormalToPlanet.scale(height));
                    vertexPosition.subtractInPlace(this.mesh.position);

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
                        vertexNormalToPlanet,
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
                        vertexNormalToPlanet,
                        index,
                        index - this.nbVerticesPerRow,
                        index - this.nbVerticesPerRow - 1
                    );
                    if (instanceIndex >= maxNbInstances) {
                        throw new Error("Too many instances");
                    }
                }
            }

            const vertexData = new VertexData();
            vertexData.positions = positions;
            vertexData.indices = indices;
            vertexData.normals = normals;
            this.vertexData = vertexData;

            vertexData.applyToMesh(this.mesh);
        }

        new PhysicsAggregate(this.mesh, PhysicsShapeType.MESH, { mass: 0 }, scene);

        await this.scatterAssets(scene);
    }

    async scatterAssets(scene: Scene) {
        if (scene.getEngine().getCaps().supportComputeShaders) {
            if (this.vertexData === null) {
                throw new Error("Vertex data is null");
            }

            const flatArea = this.size * this.size;
            [this.instancesMatrixBuffer, this.alignedInstancesMatrixBuffer] = await computeScatterPoints(
                this.vertexData,
                this.mesh.position,
                2 * flatArea,
                this.nbVerticesPerRow,
                this.scatterPerSquareMeter,
                scene.getEngine()
            );
        }

        if (this.instancesMatrixBuffer === null) {
            throw new Error("Instances matrix buffer is null");
        }
        if (this.alignedInstancesMatrixBuffer === null) {
            throw new Error("Aligned instance matrices are null");
        }

        const grassBlade = createGrassBlade(scene, 2);
        grassBlade.isVisible = false;
        grassBlade.material = createGrassMaterial(scene.lights[0] as DirectionalLight, scene);

        const patch = new ThinInstancePatch(this.mesh.position, this.alignedInstancesMatrixBuffer);
        patch.createInstances(grassBlade);

        const cube = MeshBuilder.CreateBox("cube", { size: 1 }, scene);
        cube.position.y = 0.5;
        cube.bakeCurrentTransformIntoVertices();
        cube.isVisible = false;
        cube.checkCollisions = true;
        const cubePatch = new InstancePatch(this.mesh.position, downSample(this.alignedInstancesMatrixBuffer, 5000));
        cubePatch.createInstances(cube);
    }
}

function terrainFunction(position: Vector3): [height: number, grad: Vector3] {
    const heightMultiplier = 0.2 * 0;
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
    localVerticalDirection: Vector3,
    index1: number,
    index2: number,
    index3: number
) {
    for (let i = 0; i < n; i++) {
        const [x, y, z, nx, ny, nz] = randomPointInTriangleFromBuffer(positions, normals, index1, index2, index3);
        const alignQuaternion = getTransformationQuaternion(Vector3.Up(), new Vector3(nx, ny, nz));
        const verticalQuaternion = getTransformationQuaternion(Vector3.Up(), localVerticalDirection);
        const scaling = 0.9 + Math.random() * 0.2;
        const rotation = Math.random() * 2 * Math.PI;
        const alignedMatrix = Matrix.Compose(
            new Vector3(scaling, scaling, scaling),
            alignQuaternion.multiplyInPlace(Quaternion.RotationAxis(Vector3.Up(), rotation)),
            new Vector3(x, y, z).addInPlace(chunkPosition)
        );
        const matrix = Matrix.Compose(
            new Vector3(scaling, scaling, scaling),
            verticalQuaternion.multiplyInPlace(Quaternion.RotationAxis(Vector3.Up(), rotation)),
            new Vector3(x, y, z).addInPlace(chunkPosition)
        );

        alignedMatrix.copyToArray(alignedInstancesMatrixBuffer, 16 * instanceIndex);
        matrix.copyToArray(instancesMatrixBuffer, 16 * instanceIndex);

        instanceIndex++;
    }

    return instanceIndex;
}
