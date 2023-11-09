import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {ThinInstancePatch} from "./thinInstancePatch";
import {createSquareMatrixBuffer} from "./matrixBuffer";

export class ThinInstanceScatterer {
    private readonly meshesFromLod: Mesh[];
    private readonly nbVertexFromLod: number[];
    private readonly patches: [ThinInstancePatch, number][] = [];
    private readonly patchSize: number;
    private readonly patchResolution: number;
    private readonly radius: number;

    private lodUpdateCadence = 1;

    private readonly computeLodLevel: (patch: ThinInstancePatch) => number
    private readonly queue: Array<{ newLOD: number, patch: ThinInstancePatch }> = [];

    constructor(meshesFromLod: Mesh[], radius: number, patchSize: number, patchResolution: number, computeLodLevel = (patch: ThinInstancePatch) => 0) {
        this.meshesFromLod = meshesFromLod;
        this.nbVertexFromLod = this.meshesFromLod.map((mesh) => mesh.getTotalVertices());
        this.patchSize = patchSize;
        this.patchResolution = patchResolution;
        this.radius = radius;
        this.computeLodLevel = computeLodLevel;
    }

    public addPatch(patch: ThinInstancePatch) {
        const lod = this.computeLodLevel(patch);
        this.patches.push([patch, lod]);
        this.queue.push({newLOD: lod, patch: patch});
    }

    public addPatches(patches: ThinInstancePatch[]) {
        for(const patch of patches) {
            this.addPatch(patch);
        }
    }

    public static circleInit(radius: number, patchSize: number, patchResolution: number): ThinInstancePatch[] {
        const patches: ThinInstancePatch[] = [];
        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                const radiusSquared = x * x + z * z;
                if (radiusSquared >= radius * radius) continue;

                const patchPosition = new Vector3(x * patchSize, 0, z * patchSize);
                const patchMatrixBuffer = createSquareMatrixBuffer(patchPosition, patchSize, patchResolution);
                const patch = new ThinInstancePatch(patchPosition, patchMatrixBuffer);

                patches.push(patch);
            }
        }

        return patches;
    }

    public update(playerPosition: Vector3) {
        if(this.meshesFromLod.length > 1) this.updateLOD();
    }

    private updateLOD() {
        // update LOD
        for(let i = 0; i < this.patches.length; i++) {
            const [patch, patchLod] = this.patches[i];
            const newLod = this.computeLodLevel(patch);
            if(newLod === patchLod) continue;
            this.queue.push({newLOD: newLod, patch: patch});
            this.patches[i] = [patch, newLod];
        }

        this.updateQueue(this.lodUpdateCadence);
    }

    private updateQueue(n: number) {
        // update queue
        for(let i = 0; i < n; i++) {
            const head = this.queue.shift();
            if(head === undefined) break;
            head.patch.createThinInstances(this.meshesFromLod[head.newLOD]);
        }
    }

    public initInstances() {
        this.updateQueue(this.queue.length);
    }

    public setLodUpdateCadence(cadence: number) {
        this.lodUpdateCadence = cadence;
    }

    public getNbThinInstances() {
        let count = 0;
        for (const [patch] of this.patches) {
            count += patch.getNbThinInstances();
        }
        return count;
    }

    public getNbVertices() {
        let count = 0;
        for (const [patch, patchLod] of this.patches) {
            count += this.nbVertexFromLod[patchLod] * patch.getNbThinInstances();
        }
        return count;
    }
}