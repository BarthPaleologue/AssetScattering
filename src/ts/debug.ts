import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {Color3, VertexBuffer} from "@babylonjs/core";
import {Scene} from "@babylonjs/core/scene";
import {MeshBuilder} from "@babylonjs/core/Meshes/meshBuilder";

export function showNormals(mesh: Mesh, size: number, scene: Scene) {
    const normals = mesh.getVerticesData(VertexBuffer.NormalKind);
    if(normals === null) throw new Error("Mesh has no normals");
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    if(positions === null) throw new Error("Mesh has no positions");
    const color = Color3.White();

    const lines = [];
    for (let i = 0; i < normals.length; i += 3) {
        const v1 = Vector3.FromArray(positions, i);
        const v2 = v1.add(Vector3.FromArray(normals, i).scaleInPlace(size));
        lines.push([v1.add(mesh.position), v2.add(mesh.position)]);
    }
    const normalLines = MeshBuilder.CreateLineSystem("normalLines", {lines: lines}, scene);
    normalLines.color = color;
    return normalLines;
}