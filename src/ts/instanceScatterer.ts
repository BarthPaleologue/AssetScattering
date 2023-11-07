import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {InstancePatch} from "./instancePatch";

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

        const matricesByLod: Float32Array[][] = [];
        for(let lod = 0; lod < this.meshFromLod.length; lod++) {
            matricesByLod.push([]);
        }
        const lods = new Set<number>();

        for (let x = -this.radius; x <= this.radius; x++) {
            for (let z = -this.radius; z <= this.radius; z++) {
                const radiusSquared = x * x + z * z;
                if (radiusSquared > this.radius * this.radius) continue;

                const patchPosition = new Vector3(x * patchSize, 0, z * patchSize);
                const patch = new InstancePatch( 1, patchPosition, patchSize, patchResolution);
                patch.setLOD(this.computeLodLevel(patch));

                matricesByLod[patch.lod].push(patch.matrixBuffer);
                lods.add(patch.lod);

                this.map.set(patchPosition, patch);
            }
        }

        this.updateLodMatrices(lods, matricesByLod);
    }

    update() {
        const matrixBuffersByLod: Float32Array[][] = [];
        for(let lod = 0; lod < this.meshFromLod.length; lod++) {
            matrixBuffersByLod.push([]);
        }

        const changedLODs: Set<number> = new Set();
        for (const patchPosition of this.map.keys()) {
            const patch = this.map.get(patchPosition);
            if (!patch) {
                throw new Error("Patch data not found");
            }

            const newLod = this.computeLodLevel(patch);
            if(newLod !== patch.lod) {
                changedLODs.add(newLod);
                changedLODs.add(patch.lod);
            }
            patch.setLOD(newLod);

            matrixBuffersByLod[patch.lod].push(patch.matrixBuffer);
        }

        this.updateLodMatrices(changedLODs, matrixBuffersByLod);
    }

    private updateLodMatrices(lods: Set<number>, matrixBuffersByLod: Float32Array[][]) {
        for(const lod of lods) {
            const mesh = this.meshFromLod[lod];
            const matrixBuffers = matrixBuffersByLod[lod];

            // concatenate all the matrix buffers in one buffer
            const totalLength = matrixBuffers.length > 0 ? matrixBuffers.length * matrixBuffers[0].length : 0;
            const finalMatrixBuffer = new Float32Array(totalLength);
            let offset = 0;
            for (const matrixBuffer of matrixBuffers) {
                finalMatrixBuffer.set(matrixBuffer, offset);
                offset += matrixBuffer.length;
            }

            mesh.thinInstanceSetBuffer("matrix", finalMatrixBuffer, 16);
        }
    }
}