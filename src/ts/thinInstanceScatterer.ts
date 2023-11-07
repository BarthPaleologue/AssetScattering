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
            }
        }

        this.updateMatrices();
    }

    update() {
        // do nothing for now
    }

    getNbThinInstances() {
        return this.map.size * this.patchResolution * this.patchResolution;
    }

    private updateMatrices() {
        const nbPatches = this.map.size;
        const totalLength = nbPatches > 0 ? nbPatches * 16 * this.patchResolution * this.patchResolution : 0;
        const finalMatrixBuffer = new Float32Array(totalLength);

        console.log(`Updated ${this.getNbThinInstances()} thin instance matrices`);

        // concatenate all the matrix buffers in one buffer
        let offset = 0;
        for (const patch of this.map.values()) {
            const matrixBuffer = patch.matrixBuffer;

            finalMatrixBuffer.set(matrixBuffer, offset);
            offset += matrixBuffer.length;
        }

        this.baseMesh.thinInstanceSetBuffer("matrix", finalMatrixBuffer, 16);
    }
}