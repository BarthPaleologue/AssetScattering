import {Color3} from "@babylonjs/core/Maths/math.color";
import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {VertexData} from "@babylonjs/core/Meshes/mesh.vertexData";
import {Scene} from "@babylonjs/core/scene";
import {StandardMaterial} from "@babylonjs/core";
import {makeGrassMaterial} from "./grassMaterial";

export function makeGrassBlade(scene: Scene, nbStacks: number) {
    const mesh = new Mesh("grassBlade", scene);

    const nbVertices = 2 * nbStacks + 1;
    const positions = new Float32Array(nbVertices * 3);
    const normals = new Float32Array(nbVertices * 3);
    const indices = new Uint32Array((2 * (nbStacks - 1) + 1) * 3);

    // The vertices are aranged in rows of 2 vertices, we stack the rows on top of each other until we reach the top of the blade
    let vertexIndex = 0;
    let normalIndex = 0;
    let indexIndex = 0;
    const step = 1 / nbStacks;
    for (let i = 0; i < nbStacks; i++) {
        positions[vertexIndex++] = -0.05 - 0.05 * (nbStacks - i) * step;
        positions[vertexIndex++] = i * step;
        positions[vertexIndex++] = 0;

        positions[vertexIndex++] = 0.05 + 0.05 * (nbStacks - i) * step;
        positions[vertexIndex++] = i * step;
        positions[vertexIndex++] = 0;

        normals[normalIndex++] = 0;
        normals[normalIndex++] = 0;
        normals[normalIndex++] = 1;

        normals[normalIndex++] = 0;
        normals[normalIndex++] = 0;
        normals[normalIndex++] = 1;

        if (i === 0) {
            continue;
        }

        // make 2 triangles out of the vertices
        indices[indexIndex++] = 2 * (i - 1);
        indices[indexIndex++] = 2 * (i - 1) + 1;
        indices[indexIndex++] = 2 * i;

        indices[indexIndex++] = 2 * i;
        indices[indexIndex++] = 2 * (i - 1) + 1;
        indices[indexIndex++] = 2 * i + 1;
    }

    // the last vertex is the tip of the blade
    positions[vertexIndex++] = 0;
    positions[vertexIndex++] = nbStacks * step;
    positions[vertexIndex++] = 0;

    normals[normalIndex++] = 0;
    normals[normalIndex++] = 0;
    normals[normalIndex++] = 1;

    // last triangle
    indices[indexIndex++] = 2 * (nbStacks - 1);
    indices[indexIndex++] = 2 * (nbStacks - 1) + 1;
    indices[indexIndex++] = 2 * nbStacks;

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.normals = normals;
    vertexData.indices = indices;

    vertexData.applyToMesh(mesh);

    return mesh;
}