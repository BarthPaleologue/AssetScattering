import {Engine} from "@babylonjs/core/Engines/engine";
import {Scene} from "@babylonjs/core/scene";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
/*import { Effect } from "@babylonjs/core/Materials/effect";
import { PostProcess } from "@babylonjs/core/PostProcesses/postProcess";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";*/
import {Texture} from "@babylonjs/core/Materials/Textures/texture";
import "@babylonjs/core/Loading/loadingScreen";

import "../styles/index.scss";
import {makeGrassBlade} from "./grassBlade";
import {ArcRotateCamera, DirectionalLight, MeshBuilder} from "@babylonjs/core";
import {makeGrassMaterial} from "./grassMaterial";

import perlinNoise from "../assets/perlin.png";
import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {ThinInstanceScatterer} from "./thinInstanceScatterer";

//import postprocessCode from "../shaders/smallPostProcess.glsl";

const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const engine = new Engine(canvas);
engine.displayLoadingUI();

const scene = new Scene(engine);

const camera = new ArcRotateCamera("camera", 3.14 / 2, 1, 15, Vector3.Zero(), scene);
camera.lowerRadiusLimit = 1;
camera.attachControl();

const ground = MeshBuilder.CreateGround("ground", {width: 10, height: 10}, scene);

const light = new DirectionalLight("light", new Vector3(-5, 5, 10).negateInPlace().normalize(), scene);

const highQualityGrassBlade = makeGrassBlade(scene, 4);
const lowQualityGrassBlade = makeGrassBlade(scene, 2);

const material = makeGrassMaterial(scene);
material.setVector3("lightDirection", light.direction);
material.setTexture("perlinNoise", new Texture(perlinNoise, scene));
highQualityGrassBlade.material = material;
lowQualityGrassBlade.material = material;

const patchSize = 10;
const patchResolution = 50;
const fieldRadius = 7;

const bladeMeshFromLod = new Array<Mesh>(2);
bladeMeshFromLod[0] = lowQualityGrassBlade;
bladeMeshFromLod[1] = highQualityGrassBlade;

const scatterer = new ThinInstanceScatterer(highQualityGrassBlade, fieldRadius, patchSize, patchResolution);

//Effect.ShadersStore[`PostProcess1FragmentShader`] = postprocessCode;
//const postProcess = new PostProcess("postProcess1", "PostProcess1", [], ["textureSampler"], 1, camera, Texture.BILINEAR_SAMPLINGMODE, engine);

let clock = 0;

function updateScene() {
    const deltaTime = engine.getDeltaTime() / 1000;
    clock += deltaTime;

    material.setVector3("cameraPosition", camera.position);
    material.setFloat("time", clock);

    // update grass LOD
    scatterer.update();
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

