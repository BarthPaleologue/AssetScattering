import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { Scene } from "@babylonjs/core/scene";

import tree_lod0 from "../../assets/Tree_LOD0.glb";
import tree_lod1 from "../../assets/Tree_LOD1.glb";
import tree_lod2 from "../../assets/Tree_LOD2.glb";

import "@babylonjs/loaders";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

export async function createTrees(scene: Scene): Promise<[AbstractMesh, AbstractMesh, AbstractMesh]> {
    const result0 = await SceneLoader.ImportMeshAsync("", "", tree_lod0, scene);
    const tree0 = result0.meshes[0];
    tree0.setParent(null);

    const result1 = await SceneLoader.ImportMeshAsync("", "", tree_lod1, scene);
    const tree1 = result1.meshes[0];
    tree1.setParent(null);

    const result2 = await SceneLoader.ImportMeshAsync("", "", tree_lod2, scene);
    const tree2 = result2.meshes[0];
    tree2.setParent(null);

    return [tree2, tree1, tree0];
}