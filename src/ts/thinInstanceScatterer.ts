import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {ThinInstancePatch} from "./thinInstancePatch";

export class ThinInstanceScatterer {
    readonly baseMesh: Mesh;
    readonly map = new Map<Vector3, ThinInstancePatch>();
    readonly patchSize: number;
    readonly patchResolution: number;
    readonly radius: number;

    constructor(baseMesh: Mesh, radius: number, patchSize: number, patchResolution: number) {
        this.baseMesh = baseMesh;
        this.patchSize = patchSize;
        this.patchResolution = patchResolution;
        this.radius = radius;

        for (let x = -this.radius; x <= this.radius; x++) {
            for (let z = -this.radius; z <= this.radius; z++) {
                const radiusSquared = x * x + z * z;
                if (radiusSquared >= this.radius * this.radius) continue;

                const patchPosition = new Vector3(x * patchSize, 0, z * patchSize);
                const patch = new ThinInstancePatch(patchPosition, patchSize, patchResolution);

                this.map.set(patchPosition, patch);

                patch.createThinInstances(this.baseMesh);
            }
        }
    }

    update(playerPosition: Vector3) {
        // do nothing for now
    }

    getNbThinInstances() {
        let count = 0;
        for (const patch of this.map.values()) {
            count += patch.getNbThinInstances();
        }
        return count;
    }
}