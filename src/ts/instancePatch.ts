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
        InstancePatch.Scatter(baseMeshFromLOD[lod], patchPosition, patchSize, patchResolution);
        this.position = patchPosition;
        this.size = patchSize;
        this.resolution = patchResolution;
        this.lod = lod;
    }

    setLOD(lod: number) {
        return;

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

    static Scatter(baseMesh: Mesh, patchPosition: Vector3, patchSize: number, patchResolution: number) {
        const instances = [];
        const cellSize = patchSize / patchResolution;
        for (let x = 0; x < patchResolution; x++) {
            for (let z = 0; z < patchResolution; z++) {
                /*const instance = baseMesh.createInstance(`blade${x}${z}`);
                const randomCellPositionX = Math.random() * cellSize;
                const randomCellPositionZ = Math.random() * cellSize;
                instance.position.x = patchPosition.x + (x / patchResolution) * patchSize - patchSize / 2 + randomCellPositionX;
                instance.position.z = patchPosition.z + (z / patchResolution) * patchSize - patchSize / 2 + randomCellPositionZ;
                instance.rotation.y = Math.random() * 2 * Math.PI;
                instances.push(instance);*/

                const randomCellPositionX = Math.random() * cellSize;
                const randomCellPositionZ = Math.random() * cellSize;
                const positionX = patchPosition.x + x * cellSize - (patchSize / 2) + randomCellPositionX;
                const positionZ = patchPosition.z + z * cellSize - (patchSize / 2) + randomCellPositionZ;

                const matrix = Matrix.Compose(
                    new Vector3(1, 1, 1),
                    Quaternion.RotationAxis(Vector3.Up(), Math.random() * 2 * Math.PI),
                    new Vector3(positionX, 0, positionZ)
                );

                const idx = baseMesh.thinInstanceAdd(matrix);
                instances.push(idx);
            }
        }

        return instances;
    }
}