import {Matrix, Quaternion, Vector3} from "@babylonjs/core/Maths/math.vector";
import {Mesh} from "@babylonjs/core/Meshes/mesh";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import {createSquareMatrixBuffer} from "./utils/matrixBuffer";

export class ThinInstancePatch {
    private baseMesh: Mesh | null = null;
    readonly position: Vector3;
    readonly matrixBuffer: Float32Array;

    constructor(patchPosition: Vector3, matrixBuffer: Float32Array) {
        this.position = patchPosition;
        this.matrixBuffer = matrixBuffer;
    }

    public static CreateSquare(position: Vector3, size: number, resolution: number) {
        const buffer = createSquareMatrixBuffer(position, size, resolution);
        return new ThinInstancePatch(position, buffer);
    }

    public clearThinInstances() {
        if(this.baseMesh === null) return;
        this.baseMesh.thinInstanceCount = 0;
    }

    public createThinInstances(baseMesh: Mesh) {
        this.clearThinInstances();
        if(this.baseMesh !== null) this.baseMesh.dispose();
        this.baseMesh = baseMesh.clone();
        this.baseMesh.makeGeometryUnique();
        this.baseMesh.isVisible = true;
        this.baseMesh.thinInstanceSetBuffer("matrix", this.matrixBuffer, 16);
    }

    public getNbThinInstances() {
        if(this.baseMesh === null) return 0;
        return this.baseMesh.thinInstanceCount;
    }
}