import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Direction, PlanetChunk } from "./planetChunk";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

export class Planet {
    readonly node: TransformNode;
    readonly chunks: PlanetChunk[];

    constructor(radius: number, scene: Scene) {
        this.node = new TransformNode("planet", scene);

        this.chunks = [
            new PlanetChunk(Direction.TOP, radius, scene),
            new PlanetChunk(Direction.BOTTOM, radius, scene),
            new PlanetChunk(Direction.LEFT, radius, scene),
            new PlanetChunk(Direction.RIGHT, radius, scene),
            new PlanetChunk(Direction.FRONT, radius, scene),
            new PlanetChunk(Direction.BACK, radius, scene)
        ];

        const material = new StandardMaterial("planetMaterial", scene);
        material.specularColor.scaleInPlace(0);
        //material.wireframe = true;

        this.chunks.forEach((chunk) => {
            chunk.mesh.parent = this.node;
            chunk.mesh.material = material;
            chunk.init(scene);
        });
    }
}
