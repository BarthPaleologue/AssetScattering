import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import "@babylonjs/core/Loading/loadingScreen";

import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";

import "@babylonjs/core/Misc/screenshotTools";
import { Tools } from "@babylonjs/core/Misc/tools";

import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";

import "../styles/index.scss";
import { createGrassBlade } from "./grass/grassBlade";
import { createGrassMaterial } from "./grass/grassMaterial";

import { createSkybox } from "./utils/skybox";
import { UI } from "./utils/ui";
import { createCharacterController } from "./utils/character";
import { ThinInstancePatch } from "./instancing/thinInstancePatch";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";

import windSound from "../assets/wind.mp3";

import "@babylonjs/core/Audio/audioSceneComponent";
import "@babylonjs/core/Audio/audioEngine";
import { Sound } from "@babylonjs/core/Audio/sound";

import { PatchManager } from "./instancing/patchManager";
import { downSample, randomDownSample } from "./utils/matrixBuffer";
import { Terrain } from "./terrain/terrain";

import "@babylonjs/core/Collisions/collisionCoordinator";
import "@babylonjs/core/Physics/physicsEngineComponent";
import HavokPhysics from "@babylonjs/havok";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";

import { IPatch } from "./instancing/iPatch";
import { InstancePatch } from "./instancing/instancePatch";
import { TerrainChunk } from "./terrain/terrainChunk";
import { createButterfly } from "./butterfly/butterfly";
import { createButterflyMaterial } from "./butterfly/butterflyMaterial";
import { createTree } from "./utils/tree";
import { createEngine } from "./utils/createEngine";

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
scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);
scene.executeWhenReady(() => {
    engine.runRenderLoop(() => scene.render());
});

new Sound("wind", windSound, scene, null, {
    loop: true,
    autoplay: true
});

const camera = new ArcRotateCamera("camera", -3.14 / 3, 1.4, 6, Vector3.Zero(), scene);
camera.minZ = 0.1;
camera.attachControl();

const character = await createCharacterController(scene, camera);

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

const cube = MeshBuilder.CreateBox("cube", { size: 1 }, scene);
cube.position.y = 0.5;
cube.setEnabled(false);
const cubeMaterial = new StandardMaterial("cubeMaterial", scene);
cube.material = cubeMaterial;
cube.checkCollisions = true;

const butterfly = createButterfly(scene);
butterfly.position.y = 1;
butterfly.isVisible = false;

const butterflyMaterial = createButterflyMaterial(light, scene, character);
butterfly.material = butterflyMaterial;

const tree = await createTree(scene);
tree.scaling.scaleInPlace(3);
tree.bakeCurrentTransformIntoVertices();
tree.position.y = -1;
tree.checkCollisions = true;
tree.isVisible = false;
//Mesh.INSTANCEDMESH_SORT_TRANSPARENT = true
tree.setEnabled(false);

const terrainChunkSize = 20;

const grassManager = new PatchManager([lowQualityGrassBlade, highQualityGrassBlade], (patch: IPatch) => {
    const distance = Vector3.Distance(patch.getPosition(), camera.position);
    return distance < terrainChunkSize * 3 ? 1 : 0;
});
const cubeManager = new PatchManager([cube]);
const butterflyManager = new PatchManager([butterfly]);
const treeManager = new PatchManager([tree]);

const terrain = new Terrain(
    20,
    16,
    50,
    (x, z) => {
        const heightMultiplier = 3;
        const frequency = 0.1;
        const height = Math.cos(x * frequency) * Math.sin(z * frequency) * heightMultiplier;
        const gradX = -Math.sin(x * frequency) * Math.sin(z * frequency) * frequency * heightMultiplier;
        const gradZ = Math.cos(x * frequency) * Math.cos(z * frequency) * frequency * heightMultiplier;

        return [height, gradX, gradZ];
    },
    scene
);
terrain.onCreateChunkObservable.add((chunk: TerrainChunk) => {
    if (chunk.instancesMatrixBuffer === null) {
        throw new Error("Instances matrix buffer is null");
    }
    if (chunk.alignedInstancesMatrixBuffer === null) {
        throw new Error("Aligned instance matrices are null");
    }
    const grassPatch = new ThinInstancePatch(chunk.mesh.position, chunk.instancesMatrixBuffer);
    grassManager.addPatch(grassPatch);

    const stride = 5000;
    const cubeMatrixBuffer = downSample(chunk.alignedInstancesMatrixBuffer, stride);
    const cubePatch = new InstancePatch(chunk.mesh.position, cubeMatrixBuffer);
    cubeManager.addPatch(cubePatch);

    const stride2 = 1000;
    const butterflyMatrixBuffer = randomDownSample(chunk.alignedInstancesMatrixBuffer, stride2);
    const butterflyPatch = new ThinInstancePatch(chunk.mesh.position, butterflyMatrixBuffer);
    butterflyManager.addPatch(butterflyPatch);

    const stride3 = 20000;
    const treeMatrixBuffer = randomDownSample(chunk.instancesMatrixBuffer, stride3);
    const treePatch = new InstancePatch(chunk.mesh.position, treeMatrixBuffer);
    treeManager.addPatch(treePatch);

    chunk.onDisposeObservable.add(() => {
        grassPatch.dispose();
        cubePatch.dispose();
        butterflyPatch.dispose();
        treePatch.dispose();

        grassManager.removePatch(grassPatch);
        cubeManager.removePatch(cubePatch);
        butterflyManager.removePatch(butterflyPatch);
        treeManager.removePatch(treePatch);
    });
});

const renderDistance = 6;
await terrain.init(character.position, renderDistance);

grassManager.initInstances();
cubeManager.initInstances();
butterflyManager.initInstances();
treeManager.initInstances();

const ui = new UI(scene);

document.addEventListener("keypress", (e) => {
    if (e.key === "p") {
        // take screenshot
        Tools.CreateScreenshot(engine, camera, { precision: 1 });
    }
});

let terrainUpdateCounter = 0;
scene.onBeforeRenderObservable.add(() => {
    terrainUpdateCounter++;

    ui.setText(`${grassManager.getNbInstances().toLocaleString()} grass blades\n${treeManager.getNbInstances().toLocaleString()} trees | ${engine.getFps().toFixed(0)} FPS`);

    grassManager.update();
    cubeManager.update();
    butterflyManager.update();
    treeManager.update();

    // do not update terrain every frame to prevent lag spikes
    if (terrainUpdateCounter % 30 === 0) {
        terrain.update(character.position, renderDistance, 1);
        terrainUpdateCounter = 0;
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
