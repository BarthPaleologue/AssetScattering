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
                const patch = new InstancePatch(this.meshFromLod, 1, patchPosition, patchSize, patchResolution);

                this.map.set(patchPosition, patch);
            }
        }
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

        for(const lod of changedLODs) {
            console.log("Updating LOD " + lod);
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