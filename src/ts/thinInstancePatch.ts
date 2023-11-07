import {Matrix, Quaternion, Vector3} from "@babylonjs/core/Maths/math.vector";
import {InstancedMesh} from "@babylonjs/core/Meshes/instancedMesh";

export class ThinInstancePatch {
    instances: InstancedMesh[];
    readonly position: Vector3;
    readonly size: number;
    readonly resolution: number;
    readonly matrixBuffer: Float32Array;

    constructor(patchPosition: Vector3, patchSize: number, patchResolution: number) {
        this.instances = [];
        this.position = patchPosition;
        this.size = patchSize;
        this.resolution = patchResolution;
        this.matrixBuffer = new Float32Array(16 * this.resolution * this.resolution);
        this.createMatrixBuffer();
    }

    private createMatrixBuffer() {
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
}