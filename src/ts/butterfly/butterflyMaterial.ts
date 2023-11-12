import { Scene } from "@babylonjs/core/scene";
import { Effect } from "@babylonjs/core/Materials/effect";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import butterflyFragment from "../../shaders/butterflyFragment.glsl";
import butterflyVertex from "../../shaders/butterflyVertex.glsl";

import butterflyTexture from "../../assets/butterfly.png";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";

export function createButterflyMaterial(player: TransformNode, light: DirectionalLight, scene: Scene) {
    const shaderName = "butterflyMaterial";
    Effect.ShadersStore[`${shaderName}FragmentShader`] = butterflyFragment;
    Effect.ShadersStore[`${shaderName}VertexShader`] = butterflyVertex;

    const butterflyMaterial = new ShaderMaterial(shaderName, scene, shaderName, {
        attributes: ["position", "normal", "uv"],
        uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "viewProjection", "time", "lightDirection", "playerPosition"],
        defines: ["#define INSTANCES"],
        samplers: ["butterflyTexture"]
    });

    butterflyMaterial.setTexture("butterflyTexture", new Texture(butterflyTexture, scene));
    butterflyMaterial.setVector3("lightDirection", light.direction);
    butterflyMaterial.backFaceCulling = false;

    let elapsedSeconds = 0;
    scene.onBeforeRenderObservable.add(() => {
        elapsedSeconds += scene.getEngine().getDeltaTime() / 1000;
        butterflyMaterial.setVector3("playerPosition", player.position);
        butterflyMaterial.setFloat("time", elapsedSeconds);
    });

    return butterflyMaterial;
}
