import {SceneLoader} from "@babylonjs/core/Loading/sceneLoader";
import {Scene} from "@babylonjs/core/scene";
import treeModel from "../../assets/tree.babylon";
import texture from "../../assets/Tree.tga";

import "@babylonjs/loaders";
import "@babylonjs/core";
import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {StandardMaterial} from "@babylonjs/core/Materials/standardMaterial";
import {Texture} from "@babylonjs/core/Materials/Textures/texture";

export async function createTree(scene: Scene): Promise<Mesh> {
    const result = await SceneLoader.ImportMeshAsync("", "", treeModel, scene);
    const tree = result.meshes[0];

    const treeMaterial = new StandardMaterial("treeMaterial", scene);

    treeMaterial.opacityTexture = null;
    treeMaterial.backFaceCulling = false;

    const treeTexture = new Texture(texture, scene);
    treeTexture.hasAlpha = true;

    treeMaterial.diffuseTexture = treeTexture;
    treeMaterial.specularColor.set(0, 0, 0);

    tree.material = treeMaterial;
    return tree as Mesh;
}