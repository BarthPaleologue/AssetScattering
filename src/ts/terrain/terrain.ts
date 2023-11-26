import { TerrainChunk } from "./terrainChunk";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { Observable } from "@babylonjs/core/Misc/observable";

export class Terrain {
    readonly chunkSize: number;
    readonly chunkResolution: number;
    readonly heightField: (x: number, y: number) => [height: number, gradX: number, gradZ: number];
    readonly scene: Scene;

    private readonly hashGrid: Map<string, TerrainChunk | null> = new Map();

    readonly maxDensity;

    readonly onCreateChunkObservable = new Observable<TerrainChunk>();

    private readonly creationQueue: [Vector3, number][] = [];

    constructor(
        chunkSize: number,
        chunkResolution: number,
        maxDensity: number,
        heightField: (x: number, y: number) => [height: number, gradX: number, gradZ: number],
        scene: Scene
    ) {
        this.chunkSize = chunkSize;
        this.chunkResolution = chunkResolution;
        this.maxDensity = maxDensity;
        this.heightField = heightField;
        this.scene = scene;
    }

    private async createChunk(gridPosition: Vector3, scatterPerSquareMeter: number): Promise<TerrainChunk> {
        const chunk = new TerrainChunk(gridPosition.scale(this.chunkSize), this.chunkSize, this.chunkResolution, scatterPerSquareMeter, this.scene, this.heightField);
        this.hashGrid.set(gridPosition.toString(), chunk);

        await chunk.init(this.scene);
        this.onCreateChunkObservable.notifyObservers(chunk);
        return chunk;
    }

    update(playerPosition: Vector3, renderDistance: number, creationRate: number) {
        const playerGridPosition = new Vector3(Math.round(playerPosition.x / this.chunkSize), 0, Math.round(playerPosition.z / this.chunkSize));

        // remove chunks that are too far away
        for (const [key, chunk] of this.hashGrid) {
            if (chunk === null) continue;
            const chunkGridPosition = new Vector3(Math.floor(chunk.mesh.position.x / this.chunkSize), 0, Math.floor(chunk.mesh.position.z / this.chunkSize));
            if (chunkGridPosition.subtract(playerGridPosition).lengthSquared() > renderDistance * renderDistance) {
                chunk.dispose();
                this.hashGrid.delete(key);
            }
        }

        // add chunks that are close enough
        for (let x = -renderDistance; x <= renderDistance; x++) {
            for (let z = -renderDistance; z <= renderDistance; z++) {
                if (x * x + z * z > renderDistance * renderDistance) continue;

                const chunkGridPosition = playerGridPosition.add(new Vector3(x, 0, z));
                if (this.hashGrid.has(chunkGridPosition.toString())) continue;

                this.creationQueue.push([chunkGridPosition, this.maxDensity]);
                this.hashGrid.set(chunkGridPosition.toString(), null);
            }
        }

        this.buildNextChunks(creationRate);
    }

    private buildNextChunks(n: number) {
        // dequeue chunks to create
        const promises: Promise<TerrainChunk>[] = [];
        for (let i = 0; i < n; i++) {
            const data = this.creationQueue.shift();
            if (data === undefined) break;
            const [position, scatterPerSquareMeter] = data;
            promises.push(this.createChunk(position, scatterPerSquareMeter));
        }

        return Promise.all(promises);
    }

    public async init(playerPosition: Vector3, renderDistance: number) {
        this.update(playerPosition, renderDistance, 0);
        await this.buildNextChunks(this.creationQueue.length);
    }
}
