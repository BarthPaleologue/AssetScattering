import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import "@babylonjs/core/Loading/loadingScreen";

import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";

import "../styles/index.scss";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";

import "@babylonjs/materials";
import { createSkybox } from "./utils/skybox";
import { Planet } from "./planet/createPlanet";

import "@babylonjs/core/Misc/screenshotTools";
import { Tools } from "@babylonjs/core/Misc/tools";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";

import "@babylonjs/core/Collisions/collisionCoordinator";
import "@babylonjs/core/Physics/physicsEngineComponent";
import HavokPhysics from "@babylonjs/havok";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { CharacterController } from "./utils/character";
import { createEngine } from "./utils/createEngine";

// Init babylonjs
const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const engine = await createEngine(canvas);
engine.displayLoadingUI();

if (engine.getCaps().supportComputeShaders) {
    console.log("%c Compute Shaders are supported", "background: #222; color: #bada55");
} else {
    console.warn("Compute shaders are not supported, falling back to CPU");
}

const havokInstance = await HavokPhysics();
const havokPlugin = new HavokPlugin(true, havokInstance);

const scene = new Scene(engine);
scene.enablePhysics(Vector3.Zero(), havokPlugin);
scene.executeWhenReady(() => {
    engine.runRenderLoop(() => scene.render());
});

const planetRadius = 10;

const camera = new ArcRotateCamera("camera", 0, 1.4, 6, Vector3.Zero(), scene);
camera.attachControl();

const light = new DirectionalLight("light", new Vector3(1, -2, -2).normalize(), scene);
const ambient = new HemisphericLight("hemi", light.direction, scene);
ambient.intensity = 0.2;

createSkybox(scene, light.direction.scale(-1));

await CharacterController.createAsync(scene, camera, true);

// Interesting part starts here
new Planet(planetRadius, scene);

document.addEventListener("keypress", (e) => {
    if (e.key === "p") {
        // take screenshot
        Tools.CreateScreenshot(engine, camera, { precision: 1 });
    }
});

scene.executeWhenReady(() => {
    engine.loadingScreen.hideLoadingUI();
});

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    engine.resize(true);
});
