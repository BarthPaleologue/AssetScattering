import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
/*import { Effect } from "@babylonjs/core/Materials/effect";
import { PostProcess } from "@babylonjs/core/PostProcesses/postProcess";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";*/
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Loading/loadingScreen";

import "../styles/index.scss";
import {makeGrassBlade} from "./grassBlade";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import {ArcRotateCamera, DirectionalLight} from "@babylonjs/core";
import {makeGrassMaterial} from "./grassMaterial";

//import postprocessCode from "../shaders/smallPostProcess.glsl";

const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const engine = new Engine(canvas);

const scene = new Scene(engine);

const camera = new ArcRotateCamera("camera", 3.14/2, 1, 15, Vector3.Zero(), scene);
camera.attachControl();

const light = new DirectionalLight("light", new Vector3(-5, 5, 10).negateInPlace().normalize(), scene);

const ground = MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, scene);
const groundMaterial = new StandardMaterial("groundMaterial", scene);
groundMaterial.specularColor.scaleInPlace(0);

ground.material = groundMaterial;

const grassBlade = makeGrassBlade(scene, 5);
grassBlade.isVisible = false;

const material = makeGrassMaterial(scene);
material.setVector3("lightDirection", light.direction);
grassBlade.material = material;

const grassBlades = [];
const patchSize = 10;
const patchResolution = 50;
const cellSize = patchSize / patchResolution;
const patchPosition = new Vector3(0, 0, 0);

for(let x = 0; x < patchResolution; x++) {
    for(let z = 0; z < patchResolution; z++) {
        const blade = grassBlade.createInstance(`blade${x}${z}`);
        const randomCellPositionX = Math.random() * cellSize;
        const randomCellPositionZ = Math.random() * cellSize;
        blade.position.x = patchPosition.x + (x / patchResolution) * patchSize - patchSize / 2 + randomCellPositionX;
        blade.position.z = patchPosition.z + (z / patchResolution) * patchSize - patchSize / 2 + randomCellPositionZ;
        blade.rotation.y = Math.random() * 2 * Math.PI;
        grassBlades.push(blade);
    }
}

//Effect.ShadersStore[`PostProcess1FragmentShader`] = postprocessCode;
//const postProcess = new PostProcess("postProcess1", "PostProcess1", [], ["textureSampler"], 1, camera, Texture.BILINEAR_SAMPLINGMODE, engine);

let clock = 0;
function updateScene() {
    const deltaTime = engine.getDeltaTime() / 1000;
    clock += deltaTime;
}

scene.executeWhenReady(() => {
    engine.loadingScreen.hideLoadingUI();
    scene.registerBeforeRender(() => updateScene());
    engine.runRenderLoop(() => scene.render());
});

window.addEventListener("resize", () => {
    engine.resize();
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

