import { Effect } from "@babylonjs/core/Materials/effect";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import {Scene} from "@babylonjs/core/scene";

import grassFragment from "../../shaders/grassFragment.glsl";
import grassVertex from "../../shaders/grassVertex.glsl";

export function createGrassMaterial(scene: Scene) {
    const shaderName = "grassMaterial";
    Effect.ShadersStore[`${shaderName}FragmentShader`] = grassFragment;
    Effect.ShadersStore[`${shaderName}VertexShader`] = grassVertex;

    const grassMaterial = new ShaderMaterial(shaderName, scene, shaderName, {
        attributes: ["position", "normal"],
        uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "viewProjection", "time", "lightDirection", "cameraPosition", "playerPosition"],
        defines: ["#define INSTANCES"],
        samplers: ["perlinNoise"]
    });

    grassMaterial.backFaceCulling = false;

    return grassMaterial;
}