import {TerrainChunk} from "./terrainChunk";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {Scene} from "@babylonjs/core/scene";

export class Terrain {
    readonly chunkSize: number;
    readonly chunkResolution: number;
    readonly heightField: (x: number, y: number) => [height: number, gradX: number, gradZ: number];
    readonly chunks: TerrainChunk[] = [];
    readonly scene: Scene;

    constructor(chunkSize: number, chunkResolution: number, heightField: (x: number, y: number) => [height: number, gradX: number, gradZ: number], scene: Scene) {
        this.chunkSize = chunkSize;
        this.chunkResolution = chunkResolution;
        this.heightField = heightField;
        this.scene = scene;
    }

    createChunk(position: Vector3, scatterPerSquareMeter: number): TerrainChunk {
        const chunk = new TerrainChunk(position, this.chunkSize, this.chunkResolution, scatterPerSquareMeter, null, this.scene, this.heightField);
        this.chunks.push(chunk);
        return chunk;
    }
}