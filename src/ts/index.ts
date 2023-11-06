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

//import postprocessCode from "../shaders/smallPostProcess.glsl";

const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const engine = new Engine(canvas);

const scene = new Scene(engine);

const camera = new FreeCamera("camera", new Vector3(0, 6, -10), scene);
camera.setTarget(Vector3.Zero());
camera.attachControl();

const light = new PointLight("light", new Vector3(-5, 5, 10), scene);

const ground = MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, scene);

const grassBlade = makeGrassBlade(scene, 5);
grassBlade.isVisible = false;

const grassBlades = [];
const patchSize = 10;
const patchResolution = 20;
const patchPosition = new Vector3(0, 0, 0);

for(let x = 0; x < patchResolution; x++) {
    for(let z = 0; z < patchResolution; z++) {
        const blade = grassBlade.createInstance(`blade${x}${z}`);
        blade.position.x = patchPosition.x + (x / patchResolution) * patchSize - patchSize / 2;
        blade.position.z = patchPosition.z + (z / patchResolution) * patchSize - patchSize / 2;
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

