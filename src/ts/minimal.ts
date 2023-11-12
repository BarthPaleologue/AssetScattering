import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import "@babylonjs/core/Loading/loadingScreen";

import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";

import "../styles/index.scss";
import { createGrassBlade } from "./grass/grassBlade";
import { createGrassMaterial } from "./grass/grassMaterial";

import { ThinInstancePatch } from "./instancing/thinInstancePatch";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Engine } from "@babylonjs/core/Engines/engine";

import "@babylonjs/materials";

// Init babylonjs
const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const engine = new Engine(canvas, true);
engine.displayLoadingUI();

const scene = new Scene(engine);

const camera = new ArcRotateCamera("camera", 0, 1.4, 15, Vector3.Zero(), scene);
camera.attachControl();

const light = new DirectionalLight("light", new Vector3(1, -2, -2).normalize(), scene);

// Interesting part starts here
const grassBlade = createGrassBlade(scene, 7);
grassBlade.isVisible = false;

const grassMaterial = createGrassMaterial(light, scene);
grassBlade.material = grassMaterial;

const patchSize = 20;
const patchResolution = patchSize * 10;

const patch = ThinInstancePatch.CreateSquare(new Vector3(0, 0, 0), patchSize, patchResolution);
patch.createInstances(grassBlade);

scene.executeWhenReady(() => {
    engine.loadingScreen.hideLoadingUI();
    engine.runRenderLoop(() => scene.render());
});

window.addEventListener("resize", () => {
    engine.resize();
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
