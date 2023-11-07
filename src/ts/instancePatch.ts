import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {InstancedMesh} from "@babylonjs/core/Meshes/instancedMesh";

export class InstancePatch {
    instances: InstancedMesh[];
    readonly position: Vector3;
    readonly size: number;
    readonly resolution: number;
    lod: number;

    constructor(baseMeshFromLOD: Mesh[], lod: number, patchPosition: Vector3, patchSize: number, patchResolution: number) {
        this.instances = InstancePatch.Scatter(baseMeshFromLOD[lod], patchPosition, patchSize, patchResolution);
        this.position = patchPosition;
        this.size = patchSize;
        this.resolution = patchResolution;
        this.lod = lod;
    }

    static Scatter(baseMesh: Mesh, patchPosition: Vector3, patchSize: number, patchResolution: number) {
        const instances = [];
        const cellSize = patchSize / patchResolution;
        for (let x = 0; x < patchResolution; x++) {
            for (let z = 0; z < patchResolution; z++) {
                const instance = baseMesh.createInstance(`blade${x}${z}`);
                const randomCellPositionX = Math.random() * cellSize;
                const randomCellPositionZ = Math.random() * cellSize;
                instance.position.x = patchPosition.x + (x / patchResolution) * patchSize - patchSize / 2 + randomCellPositionX;
                instance.position.z = patchPosition.z + (z / patchResolution) * patchSize - patchSize / 2 + randomCellPositionZ;
                instance.rotation.y = Math.random() * 2 * Math.PI;
                instances.push(instance);
            }
        }

        return instances;
    }
}