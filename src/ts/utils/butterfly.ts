import {VertexData} from "@babylonjs/core/Meshes/mesh.vertexData";
import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {Scene} from "@babylonjs/core/scene";

export function createButterfly(scene: Scene) {
    const positions = new Float32Array(6 * 3);
    const indices = new Uint32Array(4 * 3);

    // butter fly is made of 4 triangles (2 squares touching each other)
    // 0--1
    // | /|
    // |/ |
    // 2--3
    positions[0] = 0;
    positions[1] = 0;
    positions[2] = -1;

    positions[3] = 1;
    positions[4] = 0;
    positions[5] = -1;

    positions[6] = 0;
    positions[7] = 0.0;
    positions[8] = 0.0;

    positions[9] = 1;
    positions[10] = 0;
    positions[11] = 0;

    positions[12] = 0;
    positions[13] = 0;
    positions[14] = 1;

    positions[15] = 1;
    positions[16] = 0;
    positions[17] = 1;

    // first square
    indices[0] = 0;
    indices[1] = 1;
    indices[2] = 2;

    indices[3] = 1;
    indices[4] = 3;
    indices[5] = 2;

    // second square
    indices[6] = 2;
    indices[7] = 3;
    indices[8] = 4;

    indices[9] = 3;
    indices[10] = 5;
    indices[11] = 4;

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;

    const mesh = new Mesh("butterfly", scene);
    vertexData.applyToMesh(mesh);
    mesh.createNormals(false);

    return mesh;
}