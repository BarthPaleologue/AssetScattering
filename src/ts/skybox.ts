import {Scene} from "@babylonjs/core/scene";
import {SkyMaterial} from "@babylonjs/materials";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {MeshBuilder} from "@babylonjs/core";

export function createSkybox(scene: Scene, sunPosition: Vector3) {
    const skyMaterial = new SkyMaterial("skyMaterial", scene);
    skyMaterial.backFaceCulling = false;
    skyMaterial.sunPosition = sunPosition;
    skyMaterial.useSunPosition = true;

    const skybox = MeshBuilder.CreateBox("skyBox", {size: 1000}, scene);
    skybox.material = skyMaterial;
}