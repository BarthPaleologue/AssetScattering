import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {ThinInstancePatch} from "./thinInstancePatch";

export class ThinInstanceScatterer {
    private readonly meshesFromLod: Mesh[];
    private readonly nbVertexFromLod: number[];
    private readonly map = new Map<Vector3, [ThinInstancePatch, number]>();
    private readonly patchSize: number;
    private readonly patchResolution: number;
    private readonly radius: number;

    private lodUpdateCadence = 1;

    private readonly computeLodLevel: (patch: ThinInstancePatch) => number
    private readonly updateQueue: Array<{ newLOD: number, patch: ThinInstancePatch }> = [];

    constructor(meshesFromLod: Mesh[], radius: number, patchSize: number, patchResolution: number, computeLodLevel = (patch: ThinInstancePatch) => 0) {
        this.meshesFromLod = meshesFromLod;
        this.nbVertexFromLod = this.meshesFromLod.map((mesh) => mesh.getTotalVertices());
        this.patchSize = patchSize;
        this.patchResolution = patchResolution;
        this.radius = radius;
        this.computeLodLevel = computeLodLevel;

        for (let x = -this.radius; x <= this.radius; x++) {
            for (let z = -this.radius; z <= this.radius; z++) {
                const radiusSquared = x * x + z * z;
                if (radiusSquared >= this.radius * this.radius) continue;

                const patchPosition = new Vector3(x * this.patchSize, 0, z * this.patchSize);
                const patchMatrixBuffer = ThinInstancePatch.createSquareMatrixBuffer(patchPosition, this.patchSize, this.patchResolution);
                const patch = new ThinInstancePatch(patchPosition, patchMatrixBuffer);
                const patchLod = this.computeLodLevel(patch);

                this.map.set(patchPosition, [patch, patchLod]);

                patch.createThinInstances(this.meshesFromLod[patchLod]);
            }
        }
    }

    public update(playerPosition: Vector3) {
        if(this.meshesFromLod.length > 1) this.updateLOD();
    }

    private updateLOD() {
        // update LOD
        for(const [patch, patchLod] of this.map.values()) {
            const newLod = this.computeLodLevel(patch);
            if(newLod === patchLod) continue;
            this.updateQueue.push({newLOD: newLod, patch: patch});
            this.map.set(patch.position, [patch, newLod]);
        }

        // update queue
        for(let i = 0; i < this.lodUpdateCadence; i++) {
            const head = this.updateQueue.shift();
            if(head === undefined) break;
            head.patch.createThinInstances(this.meshesFromLod[head.newLOD]);
        }
    }

    public setLodUpdateCadence(cadence: number) {
        this.lodUpdateCadence = cadence;
    }

    public getNbThinInstances() {
        let count = 0;
        for (const [patch] of this.map.values()) {
            count += patch.getNbThinInstances();
        }
        return count;
    }

    public getNbVertices() {
        let count = 0;
        for (const [patch, patchLod] of this.map.values()) {
            count += this.nbVertexFromLod[patchLod] * patch.getNbThinInstances();
        }
        return count;
    }
}