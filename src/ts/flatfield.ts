import {Scene} from "@babylonjs/core/scene";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {Texture} from "@babylonjs/core/Materials/Textures/texture";
import "@babylonjs/core/Loading/loadingScreen";

import {ActionManager, ExecuteCodeAction} from "@babylonjs/core/Actions";

import {Tools} from "@babylonjs/core/Misc/tools";
import {DirectionalLight} from "@babylonjs/core/Lights/directionalLight";
import {HemisphericLight} from "@babylonjs/core/Lights/hemisphericLight";

import "../styles/index.scss";
import {createGrassBlade} from "./grass/grassBlade";
import {createGrassMaterial} from "./grass/grassMaterial";

import perlinNoise from "../assets/perlin.png";
import {createSkybox} from "./utils/skybox";
import {UI} from "./utils/ui";
import {createCharacterController} from "./utils/character";
import {ThinInstancePatch} from "./thinInstancePatch";
import {ArcRotateCamera} from "@babylonjs/core/Cameras/arcRotateCamera";

import windSound from "../assets/wind.mp3";

import "@babylonjs/core/Collisions/collisionCoordinator"
import "@babylonjs/core/Audio/audioSceneComponent";
import "@babylonjs/core/Audio/audioEngine";
import {Sound} from "@babylonjs/core/Audio/sound";
import {Engine} from "@babylonjs/core/Engines/engine";

import "@babylonjs/core/Physics/physicsEngineComponent";
import {ThinInstanceScatterer} from "./thinInstanceScatterer";
import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {MeshBuilder} from "@babylonjs/core/Meshes/meshBuilder";
import {StandardMaterial} from "@babylonjs/core/Materials/standardMaterial";

// Init babylonjs
const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const engine = new Engine(canvas, true);

engine.displayLoadingUI();

const scene = new Scene(engine);
scene.useRightHandedSystem = true;

const camera = new ArcRotateCamera("camera", 0, 1.4, 15, Vector3.Zero(), scene);
camera.minZ = 0.1;
camera.attachControl();

const light = new DirectionalLight("light", new Vector3(-5, 10, 10).negateInPlace().normalize(), scene);
new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
createSkybox(scene, light.direction.scale(-1));

new Sound("wind", windSound, scene, null, {
    loop: true,
    autoplay: true
});

const inputMap: Map<string, boolean> = new Map<string, boolean>();
scene.actionManager = new ActionManager(scene);
scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (e) => {
    inputMap.set(e.sourceEvent.key, e.sourceEvent.type == "keydown");
}));
scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (e) => {
    inputMap.set(e.sourceEvent.key, e.sourceEvent.type == "keydown");
}));

const character = await createCharacterController(scene, camera, inputMap);

// Interesting part starts here
const perlinTexture = new Texture(perlinNoise, scene);

const highQualityGrassBlade = createGrassBlade(scene, 4);
highQualityGrassBlade.isVisible = false;
const lowQualityGrassBlade = createGrassBlade(scene, 1);
lowQualityGrassBlade.isVisible = false;

const material = createGrassMaterial(scene);
material.setVector3("lightDirection", light.direction);
material.setTexture("perlinNoise", perlinTexture);
highQualityGrassBlade.material = material;
lowQualityGrassBlade.material = material;

const patchSize = 10;
const patchResolution = patchSize * 5;
const fieldRadius = 17;

const bladeMeshFromLod = new Array<Mesh>(2);
bladeMeshFromLod[0] = lowQualityGrassBlade;
bladeMeshFromLod[1] = highQualityGrassBlade;

const grassScatterer = new ThinInstanceScatterer(bladeMeshFromLod, (patch: ThinInstancePatch) => {
    const distance = Vector3.Distance(patch.position, camera.position);
    return distance < patchSize * 3 ? 1 : 0;
});

grassScatterer.addPatches(ThinInstanceScatterer.circleInit(fieldRadius, patchSize, patchResolution));
grassScatterer.initInstances();

const ground = MeshBuilder.CreateGround("ground", {
    width: patchSize * fieldRadius * 2,
    height: patchSize * fieldRadius * 2
}, scene);
const groundMaterial = new StandardMaterial("groundMaterial", scene);
groundMaterial.diffuseColor.set(0.02, 0.1, 0.01);
groundMaterial.specularColor.scaleInPlace(0);
ground.material = groundMaterial;

const ui = new UI(scene);

document.addEventListener("keypress", (e) => {
    if (e.key === "p") {
        // take screenshot
        Tools.CreateScreenshot(engine, camera, {precision: 1});
    }
});

let clock = 0;

function updateScene() {
    const deltaTime = engine.getDeltaTime() / 1000;
    clock += deltaTime;

    material.setVector3("playerPosition", character.position);
    material.setVector3("cameraPosition", camera.position);
    material.setFloat("time", clock);

    ui.setText(`${grassScatterer.getNbThinInstances().toLocaleString()} grass blades\n${grassScatterer.getNbVertices().toLocaleString()} vertices | ${engine.getFps().toFixed(0)} FPS`);

    grassScatterer.update(camera.position);
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

