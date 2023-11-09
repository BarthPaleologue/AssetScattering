import {Matrix, Quaternion, Vector3} from "@babylonjs/core/Maths/math.vector";
import {Mesh} from "@babylonjs/core/Meshes/mesh";
import "@babylonjs/core/Meshes/thinInstanceMesh";

export class ThinInstancePatch {
    private baseMesh: Mesh | null = null;
    readonly position: Vector3;
    readonly matrixBuffer: Float32Array;

    constructor(patchPosition: Vector3, matrixBuffer: Float32Array) {
        this.position = patchPosition;
        this.matrixBuffer = matrixBuffer;
    }

    public static createSquareMatrixBuffer(position: Vector3, size: number, resolution: number) {
        const matrixBuffer = new Float32Array(resolution * resolution * 16);
        const cellSize = size / resolution;
        let index = 0;
        for (let x = 0; x < resolution; x++) {
            for (let z = 0; z < resolution; z++) {
                const randomCellPositionX = Math.random() * cellSize;
                const randomCellPositionZ = Math.random() * cellSize;
                const positionX = position.x + x * cellSize - (size / 2) + randomCellPositionX;
                const positionZ = position.z + z * cellSize - (size / 2) + randomCellPositionZ;
                const scaling = 0.7 + Math.random() * 0.6;

                const matrix = Matrix.Compose(
                    new Vector3(scaling, scaling, scaling),
                    Quaternion.RotationAxis(Vector3.Up(), Math.random() * 2 * Math.PI),
                    new Vector3(positionX, 0, positionZ)
                );
                matrix.copyToArray(matrixBuffer, 16 * index);

                index += 1;
            }
        }

        return matrixBuffer;
    }

    public clearThinInstances() {
        if(this.baseMesh === null) return;
        this.baseMesh.thinInstanceCount = 0;
    }

    public createThinInstances(baseMesh: Mesh) {
        this.clearThinInstances();
        if(this.baseMesh !== null) this.baseMesh.dispose();
        this.baseMesh = baseMesh.clone();
        this.baseMesh.position = this.position;
        this.baseMesh.makeGeometryUnique();
        this.baseMesh.isVisible = true;
        this.baseMesh.thinInstanceSetBuffer("matrix", this.matrixBuffer, 16);
    }

    public getNbThinInstances() {
        if(this.baseMesh === null) return 0;
        return this.baseMesh.thinInstanceCount;
    }
}