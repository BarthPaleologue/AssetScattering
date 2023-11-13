import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import "@babylonjs/core/Loading/loadingScreen";

import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";

import "../styles/index.scss";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Engine } from "@babylonjs/core/Engines/engine";

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
import { createCharacterController } from "./utils/character";
import { setUpVector } from "./utils/algebra";

// Init babylonjs
const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const engine = new Engine(canvas, true);
engine.displayLoadingUI();

const havokInstance = await HavokPhysics();
const havokPlugin = new HavokPlugin(true, havokInstance);

const scene = new Scene(engine);
scene.enablePhysics(Vector3.Zero(), havokPlugin);

const planetRadius = 10;

const camera = new ArcRotateCamera("camera", 0, 1.4, 6, Vector3.Zero(), scene);
camera.attachControl();

const light = new DirectionalLight("light", new Vector3(1, -2, -2).normalize(), scene);
const ambient = new HemisphericLight("hemi", light.direction, scene);
ambient.intensity = 0.2;

createSkybox(scene, light.direction.scale(-1));

const character = await createCharacterController(scene, camera);
scene.onAfterPhysicsObservable.add(() => {
   setUpVector(character, character.position.subtract(planet.node.position).normalize());

   camera.upVector = character.up;

   character.computeWorldMatrix(true);
   camera.getViewMatrix(true);
});

// Interesting part starts here
const planet = new Planet(planetRadius, scene);

document.addEventListener("keypress", (e) => {
    if (e.key === "p") {
        // take screenshot
        Tools.CreateScreenshot(engine, camera, { precision: 1 });
    }
});

scene.executeWhenReady(() => {
    engine.loadingScreen.hideLoadingUI();
    engine.runRenderLoop(() => scene.render());
});

window.addEventListener("resize", () => {
    engine.resize();
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
