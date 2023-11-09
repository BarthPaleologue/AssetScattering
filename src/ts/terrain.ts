import {TerrainChunk} from "./terrainChunk";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {Scene} from "@babylonjs/core/scene";

export class Terrain {
    readonly chunkSize: number;
    readonly chunkResolution: number;
    readonly heightField: (x: number, y: number) => [height: number, normalX: number, normalY: number, normalZ: number];
    readonly chunks: TerrainChunk[] = [];
    readonly scene: Scene;

    constructor(chunkSize: number, chunkResolution: number, heightField: (x: number, y: number) => [height: number, normalX: number, normalY: number, normalZ: number], scene: Scene) {
        this.chunkSize = chunkSize;
        this.chunkResolution = chunkResolution;
        this.heightField = heightField;
        this.scene = scene;
    }

    createChunk(position: Vector3, scatterPerSquareMeter: number): TerrainChunk {
        const chunk = new TerrainChunk(position, this.chunkSize, this.chunkResolution, scatterPerSquareMeter, Vector3.Up(), this.scene, this.heightField);
        this.chunks.push(chunk);
        return chunk;
    }
}