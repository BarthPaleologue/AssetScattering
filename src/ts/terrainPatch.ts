import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {Scene} from "@babylonjs/core/scene";
import {StandardMaterial} from "@babylonjs/core/Materials/standardMaterial";
import {VertexData} from "@babylonjs/core/Meshes/mesh.vertexData";

export class TerrainPatch {
    readonly nbVerticesPerRow: number;
    readonly mesh: Mesh;
    readonly material: StandardMaterial;

    constructor(size: number, nbVerticesPerRow: number, scene: Scene) {
        this.mesh = new Mesh("terrainPatch", scene);
        this.material = new StandardMaterial("terrainPatchMaterial", scene);
        this.material.wireframe = true;
        this.mesh.material = this.material;

        this.nbVerticesPerRow = nbVerticesPerRow;

        const positions = new Float32Array(this.nbVerticesPerRow * this.nbVerticesPerRow * 3);
        const normals = new Float32Array(this.nbVerticesPerRow * this.nbVerticesPerRow * 3);
        const indices = new Uint32Array((this.nbVerticesPerRow - 1) * (this.nbVerticesPerRow - 1) * 6);

        const stepSize = size / (this.nbVerticesPerRow - 1);

        let indexIndex = 0;
        for(let x = 0; x < this.nbVerticesPerRow; x++) {
            for(let y = 0; y < this.nbVerticesPerRow; y++) {
                const index = x * this.nbVerticesPerRow + y;
                positions[3 * index + 0] = x * stepSize - size / 2;
                positions[3 * index + 1] = 0;
                positions[3 * index + 2] = y * stepSize - size / 2;

                normals[3 * index + 0] = 0;
                normals[3 * index + 1] = 1;
                normals[3 * index + 2] = 0;

                if(x == 0 || y == 0) continue;

                indices[indexIndex++] = index - 1;
                indices[indexIndex++] = index;
                indices[indexIndex++] = index - this.nbVerticesPerRow - 1;

                indices[indexIndex++] = index;
                indices[indexIndex++] = index - this.nbVerticesPerRow;
                indices[indexIndex++] = index - this.nbVerticesPerRow - 1;
            }
        }

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.normals = normals;

        vertexData.applyToMesh(this.mesh);
    }
}