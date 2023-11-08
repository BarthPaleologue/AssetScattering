import {Matrix, Quaternion, Vector3} from "@babylonjs/core/Maths/math.vector";
import {Mesh} from "@babylonjs/core/Meshes/mesh";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import {TransformNode} from "@babylonjs/core/Meshes/transformNode";

export class ThinInstancePatch {
    private baseMesh: Mesh | null = null;
    readonly position: Vector3;
    readonly size: number;
    readonly resolution: number;
    readonly matrixBuffer: Float32Array;

    constructor(patchPosition: Vector3, patchSize: number, patchResolution: number, matrixBuffer: Float32Array | null = null) {
        this.position = patchPosition;
        this.size = patchSize;
        this.resolution = patchResolution;
        this.matrixBuffer = matrixBuffer === null ? new Float32Array(16 * this.resolution * this.resolution) : matrixBuffer;
        if(matrixBuffer === null) this.populateMatrixBuffer();
    }

    public populateMatrixBuffer() {
        const cellSize = this.size / this.resolution;
        let index = 0;
        for (let x = 0; x < this.resolution; x++) {
            for (let z = 0; z < this.resolution; z++) {
                const randomCellPositionX = Math.random() * cellSize;
                const randomCellPositionZ = Math.random() * cellSize;
                const positionX = this.position.x + x * cellSize - (this.size / 2) + randomCellPositionX;
                const positionZ = this.position.z + z * cellSize - (this.size / 2) + randomCellPositionZ;
                const scaling = 0.7 + Math.random() * 0.6;

                const matrix = Matrix.Compose(
                    new Vector3(scaling, scaling, scaling),
                    Quaternion.RotationAxis(Vector3.Up(), Math.random() * 2 * Math.PI),
                    new Vector3(positionX, 0, positionZ)
                );
                matrix.copyToArray(this.matrixBuffer, 16 * index);

                index += 1;
            }
        }
    }

    public clearThinInstances() {
        if(this.baseMesh === null) return;
        this.baseMesh.thinInstanceCount = 0;
    }

    public createThinInstances(baseMesh: Mesh) {
        this.clearThinInstances();
        if(this.baseMesh !== null) this.baseMesh.dispose();
        this.baseMesh = baseMesh.clone();
        this.baseMesh.makeGeometryUnique();
        this.baseMesh.isVisible = true;
        this.baseMesh.thinInstanceSetBuffer("matrix", this.matrixBuffer, 16);
    }

    public getTransform(): TransformNode {
        if(this.baseMesh === null) throw new Error("Cannot get the transform of a patch without thin instances");
        return this.baseMesh;
    }

    public getNbThinInstances() {
        if(this.baseMesh === null) return 0;
        return this.baseMesh.thinInstanceCount;
    }
}