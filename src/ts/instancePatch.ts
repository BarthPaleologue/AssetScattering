import {Matrix, Quaternion, Vector3} from "@babylonjs/core/Maths/math.vector";
import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {InstancedMesh} from "@babylonjs/core/Meshes/instancedMesh";

function swap(oldInstance: InstancedMesh, newInstance: InstancedMesh) {
    newInstance.position.copyFrom(oldInstance.position);
    newInstance.rotation.copyFrom(oldInstance.rotation);
    newInstance.scaling.copyFrom(oldInstance.scaling);
    oldInstance.dispose();
}

export class InstancePatch {
    private readonly meshFromLod: Mesh[];
    instances: InstancedMesh[];
    readonly position: Vector3;
    readonly size: number;
    readonly resolution: number;
    lod: number;

    constructor(baseMeshFromLOD: Mesh[], lod: number, patchPosition: Vector3, patchSize: number, patchResolution: number) {
        this.meshFromLod = baseMeshFromLOD;
        this.instances = [];
        this.position = patchPosition;
        this.size = patchSize;
        this.resolution = patchResolution;
        this.lod = lod;
        this.scatter();
    }

    setLOD(lod: number) {
        if (lod === this.lod) return;

        const newInstances = [];
        for (const instance of this.instances) {
            const bladeType = this.meshFromLod[lod];
            const newInstance = bladeType.createInstance(instance.name);
            swap(instance, newInstance);
            newInstances.push(newInstance);
        }

        this.instances = newInstances;
        this.lod = lod;
    }

    scatter() {
        const instances = [];
        const nbInstances = this.resolution * this.resolution;
        const matrixBuffer = new Float32Array(16 * nbInstances);

        const matrices: Matrix[] = [];
        const cellSize = this.size / this.resolution;
        let index = 0;
        for (let x = 0; x < this.resolution; x++) {
            for (let z = 0; z < this.resolution; z++) {
                const randomCellPositionX = Math.random() * cellSize;
                const randomCellPositionZ = Math.random() * cellSize;
                const positionX = this.position.x + x * cellSize - (this.size / 2) + randomCellPositionX;
                const positionZ = this.position.z + z * cellSize - (this.size / 2) + randomCellPositionZ;

                const matrix = Matrix.Compose(
                    new Vector3(1, 1, 1),
                    Quaternion.RotationAxis(Vector3.Up(), Math.random() * 2 * Math.PI),
                    new Vector3(positionX, 0, positionZ)
                );
                matrices.push(matrix);
                matrix.copyToArray(matrixBuffer, 16 * index);

                index += 1;
            }
        }

        const baseMesh = this.meshFromLod[this.lod];

        const idx = baseMesh.thinInstanceAdd(matrices);
        for(let i = 0; i < nbInstances; i++) {
            instances.push(idx + i);
        }

        return instances;
    }
}