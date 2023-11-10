import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {Vector3} from "@babylonjs/core/Maths/math.vector";

export interface IPatch {
    clearInstances(): void;
    createInstances(baseMesh: Mesh): void;
    getNbInstances(): number;
    getPosition(): Vector3;
    dispose(): void;
}