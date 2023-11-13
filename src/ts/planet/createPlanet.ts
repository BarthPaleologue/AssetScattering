import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { createChunk, Direction } from "./chunk";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

export function createPlanet(radius: number, scene: Scene) {
    const planet = new TransformNode("planet", scene);

    const topChunk = createChunk(Direction.TOP, scene);
    topChunk.parent = planet;

    const bottomChunk = createChunk(Direction.BOTTOM, scene);
    bottomChunk.parent = planet;

    const leftChunk = createChunk(Direction.LEFT, scene);
    leftChunk.parent = planet;

    const rightChunk = createChunk(Direction.RIGHT, scene);
    rightChunk.parent = planet;

    const frontChunk = createChunk(Direction.FRONT, scene);
    frontChunk.parent = planet;

    const backChunk = createChunk(Direction.BACK, scene);
    backChunk.parent = planet;

    const material = new StandardMaterial("planetMaterial", scene);
    material.wireframe = true;

    topChunk.material = material;
    bottomChunk.material = material;
    leftChunk.material = material;
    rightChunk.material = material;
    frontChunk.material = material;
    backChunk.material = material;

    return planet;
}