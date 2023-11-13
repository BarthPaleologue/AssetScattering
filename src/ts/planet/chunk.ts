import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";

export enum Direction {
    FRONT,
    BACK,
    LEFT,
    RIGHT,
    TOP,
    BOTTOM
}

export function createChunk(direction: Direction, scene: Scene) {
    const chunk = new Mesh("chunk", scene);

    return chunk;
}