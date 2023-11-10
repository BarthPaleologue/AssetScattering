import {Scene} from "@babylonjs/core/scene";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import "@babylonjs/core/Loading/loadingScreen";

import {ActionManager, ExecuteCodeAction} from "@babylonjs/core/Actions";

import {MeshBuilder} from "@babylonjs/core/Meshes/meshBuilder";

import "@babylonjs/core/Misc/screenshotTools";
import {Tools} from "@babylonjs/core/Misc/tools";

import {StandardMaterial} from "@babylonjs/core/Materials/standardMaterial";
import {DirectionalLight} from "@babylonjs/core/Lights/directionalLight";
import {HemisphericLight} from "@babylonjs/core/Lights/hemisphericLight";

import "../styles/index.scss";
import {createGrassBlade} from "./grass/grassBlade";
import {createGrassMaterial} from "./grass/grassMaterial";

import {createSkybox} from "./utils/skybox";
import {UI} from "./utils/ui";
import {createCharacterController} from "./utils/character";
import {ThinInstancePatch} from "./instancing/thinInstancePatch";
import {ArcRotateCamera} from "@babylonjs/core/Cameras/arcRotateCamera";

import windSound from "../assets/wind.mp3";

import "@babylonjs/core/Collisions/collisionCoordinator"
import "@babylonjs/core/Audio/audioSceneComponent";
import "@babylonjs/core/Audio/audioEngine";
import {Sound} from "@babylonjs/core/Audio/sound";
import {Engine} from "@babylonjs/core/Engines/engine";

import "@babylonjs/core/Physics/physicsEngineComponent";
import {PatchManager} from "./instancing/patchManager";
import {downSample, randomDownSample} from "./utils/matrixBuffer";
import {Terrain} from "./terrain/terrain";

import HavokPhysics from "@babylonjs/havok";
import {HavokPlugin} from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import {IPatch} from "./instancing/iPatch";
import {InstancePatch} from "./instancing/instancePatch";
import {TerrainChunk} from "./terrain/terrainChunk";
import {createButterfly} from "./utils/butterfly";
import {createButterflyMaterial} from "./utils/butterflyMaterial";

const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const engine = new Engine(canvas, true);
engine.displayLoadingUI();

const havokInstance = await HavokPhysics();
const havokPlugin = new HavokPlugin(true, havokInstance);

const scene = new Scene(engine);
scene.useRightHandedSystem = true;
scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);

const inputMap: Map<string, boolean> = new Map<string, boolean>();
scene.actionManager = new ActionManager(scene);
scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (e) => {
    inputMap.set(e.sourceEvent.key, e.sourceEvent.type == "keydown");
}));
scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (e) => {
    inputMap.set(e.sourceEvent.key, e.sourceEvent.type == "keydown");
}));

new Sound("wind", windSound, scene, null, {
    loop: true,
    autoplay: true
})

const camera = new ArcRotateCamera("camera", 0, 1.4, 15, Vector3.Zero(), scene);
camera.minZ = 0.1;
camera.attachControl();

const character = await createCharacterController(scene, camera, inputMap);

const light = new DirectionalLight("light", new Vector3(-5, 10, 10).negateInPlace().normalize(), scene);
new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);

createSkybox(scene, light.direction.scale(-1));

const highQualityGrassBlade = createGrassBlade(scene, 4);
highQualityGrassBlade.isVisible = false;
const lowQualityGrassBlade = createGrassBlade(scene, 1);
lowQualityGrassBlade.isVisible = false;

const grassMaterial = createGrassMaterial(light, scene, character);
highQualityGrassBlade.material = grassMaterial;
lowQualityGrassBlade.material = grassMaterial;

const cube = MeshBuilder.CreateBox("cube", {size: 1}, scene);
cube.position.y = 0.5;
cube.setEnabled(false);
const cubeMaterial = new StandardMaterial("cubeMaterial", scene);
cube.material = cubeMaterial;
cube.checkCollisions = true;

const butterfly = createButterfly(scene);
butterfly.position.y = 1;
butterfly.isVisible = false;

const butterflyMaterial = createButterflyMaterial(character, light, scene);
butterfly.material = butterflyMaterial;

const terrainChunkSize = 20;

const grassManager = new PatchManager([lowQualityGrassBlade, highQualityGrassBlade], (patch: IPatch) => {
    const distance = Vector3.Distance(patch.getPosition(), camera.position);
    return distance < terrainChunkSize * 3 ? 1 : 0;
});
const cubeManager = new PatchManager([cube]);
const butterflyManager = new PatchManager([butterfly]);

const terrain = new Terrain(20, 16, 50, (x, z) => {
    const heightMultiplier = 5;
    const frequency = 0.1;
    const height = Math.cos(x * frequency) * Math.sin(z * frequency) * heightMultiplier;
    const gradX = -Math.sin(x * frequency) * Math.sin(z * frequency) * frequency * heightMultiplier;
    const gradZ = Math.cos(x * frequency) * Math.cos(z * frequency) * frequency * heightMultiplier;

    return [height, gradX, gradZ];
}, scene);
terrain.onCreateChunkObservable.add((chunk: TerrainChunk) => {
    const grassPatch = new ThinInstancePatch(chunk.mesh.position, chunk.instancesMatrixBuffer);
    grassManager.addPatch(grassPatch);

    const stride = 2000;
    const cubeMatrixBuffer = downSample(chunk.alignedInstancesMatrixBuffer, stride);
    const cubePatch = new InstancePatch(chunk.mesh.position, cubeMatrixBuffer);
    cubeManager.addPatch(cubePatch);

    const stride2 = 1000;
    const butterflyMatrixBuffer = randomDownSample(chunk.alignedInstancesMatrixBuffer, stride2);
    const butterflyPatch = new ThinInstancePatch(chunk.mesh.position, butterflyMatrixBuffer);
    butterflyManager.addPatch(butterflyPatch);

    chunk.onDisposeObservable.add(() => {
        grassPatch.dispose();
        cubePatch.dispose();
        butterflyPatch.dispose();

        grassManager.removePatch(grassPatch);
        cubeManager.removePatch(cubePatch);
        butterflyManager.removePatch(butterflyPatch);
    });
});

const renderDistance = 6;
terrain.init(character.position, renderDistance);

grassManager.initInstances();
cubeManager.initInstances();


const ui = new UI(scene);

document.addEventListener("keypress", (e) => {
    if (e.key === "p") {
        // take screenshot
        Tools.CreateScreenshot(engine, camera, {precision: 1});
    }
});

let terrainUpdateCounter = 0;
function updateScene() {
    terrainUpdateCounter++;

    ui.setText(`${grassManager.getNbInstances().toLocaleString()} grass blades\n${cubeManager.getNbInstances().toLocaleString()} cubes | ${engine.getFps().toFixed(0)} FPS`);

    grassManager.update(camera.position);
    cubeManager.update(camera.position);
    butterflyManager.update(camera.position);

    // do not update terrain every frame to prevent lag spikes
    if (terrainUpdateCounter % 30 === 0) {
        terrain.update(character.position, renderDistance, 1);
        terrainUpdateCounter = 0;
    }
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

