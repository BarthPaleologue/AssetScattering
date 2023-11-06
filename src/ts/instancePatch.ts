import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {Mesh} from "@babylonjs/core/Meshes/mesh";

export function makeInstancePatch(instance: Mesh, patchPosition: Vector3, patchSize: number, patchResolution: number) {
    const instances = [];
    const cellSize = patchSize / patchResolution;
    for(let x = 0; x < patchResolution; x++) {
        for(let z = 0; z < patchResolution; z++) {
            const blade = instance.createInstance(`blade${x}${z}`);
            const randomCellPositionX = Math.random() * cellSize;
            const randomCellPositionZ = Math.random() * cellSize;
            blade.position.x = patchPosition.x + (x / patchResolution) * patchSize - patchSize / 2 + randomCellPositionX;
            blade.position.z = patchPosition.z + (z / patchResolution) * patchSize - patchSize / 2 + randomCellPositionZ;
            blade.rotation.y = Math.random() * 2 * Math.PI;
            instances.push(blade);
        }
    }

    return instances;
}