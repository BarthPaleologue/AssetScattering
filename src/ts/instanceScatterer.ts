import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {InstancePatch} from "./instancePatch";
import { Camera } from "@babylonjs/core/Cameras/camera";
import {InstancedMesh} from "@babylonjs/core/Meshes/instancedMesh";

export class InstanceScatterer {
    readonly meshFromLod: Mesh[];
    readonly map = new Map<Vector3, InstancePatch>();
    readonly patchSize: number;
    readonly patchResolution: number;
    readonly radius: number;

    computeLodLevel: (patch: InstancePatch) => number;

    constructor(meshFromLod: Mesh[], radius: number, patchSize: number, patchResolution: number, computeLodLevel: (patch: InstancePatch) => number) {
        this.meshFromLod = meshFromLod;
        this.patchSize = patchSize;
        this.patchResolution = patchResolution;
        this.radius = radius;
        this.computeLodLevel = computeLodLevel;

        for (let x = -this.radius; x <= this.radius; x++) {
            for (let z = -this.radius; z <= this.radius; z++) {
                const radiusSquared = x * x + z * z;
                if (radiusSquared > this.radius * this.radius) continue;

                const patchPosition = new Vector3(x * patchSize, 0, z * patchSize);
                const patch = new InstancePatch(this.meshFromLod, 0, patchPosition, patchSize, patchResolution);

                this.map.set(patchPosition, patch);
            }
        }
    }

    update() {
        for (const patchPosition of this.map.keys()) {
            const patch = this.map.get(patchPosition);
            if (!patch) {
                throw new Error("Patch data not found");
            }

            const newLod = this.computeLodLevel(patch);
            patch.setLOD(newLod);
        }
    }
}