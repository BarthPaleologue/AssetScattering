import {Scene} from "@babylonjs/core/scene";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {Texture} from "@babylonjs/core/Materials/Textures/texture";
import "@babylonjs/core/Loading/loadingScreen";

import {ActionManager, ExecuteCodeAction} from "@babylonjs/core/Actions";

import {MeshBuilder} from "@babylonjs/core/Meshes/meshBuilder";
import {Tools} from "@babylonjs/core/Misc/tools";
import {StandardMaterial} from "@babylonjs/core/Materials/standardMaterial";
import {DirectionalLight} from "@babylonjs/core/Lights/directionalLight";
import {HemisphericLight} from "@babylonjs/core/Lights/hemisphericLight";

import "../styles/index.scss";
import {createGrassBlade} from "./grassBlade";
import {createGrassMaterial} from "./grassMaterial";

import perlinNoise from "../assets/perlin.png";
import {createSkybox} from "./skybox";
import {UI} from "./ui";
import {createCharacterController} from "./character";
import {ThinInstancePatch} from "./thinInstancePatch";
import {ArcRotateCamera} from "@babylonjs/core/Cameras/arcRotateCamera";

import windSound from "../assets/wind.mp3";

import "@babylonjs/core/Audio/audioSceneComponent";
import "@babylonjs/core/Audio/audioEngine";
import {Sound} from "@babylonjs/core/Audio/sound";
import {Engine} from "@babylonjs/core";

import "@babylonjs/core/Physics/physicsEngineComponent";
import {TerrainChunk} from "./terrainChunk";
import {ThinInstanceScatterer} from "./thinInstanceScatterer";
import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {downSample} from "./matrixBuffer";
import {showNormals} from "./debug";
import {Terrain} from "./terrain";

const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const engine = new Engine(canvas, true);

engine.displayLoadingUI();

const scene = new Scene(engine);
scene.useRightHandedSystem = true;

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

const cube = MeshBuilder.CreateBox("cube", {size: 1}, scene);
cube.position.y = 0.5;
cube.isVisible = false;
const cubeMaterial = new StandardMaterial("cubeMaterial", scene);
cube.material = cubeMaterial;

/*const patchSize = 10;
const patchResolution = patchSize * 5;
const fieldRadius = 17;

const bladeMeshFromLod = new Array<Mesh>(2);
bladeMeshFromLod[0] = lowQualityGrassBlade;
bladeMeshFromLod[1] = highQualityGrassBlade;

const grassScatterer = new ThinInstanceScatterer(bladeMeshFromLod, fieldRadius, patchSize, patchResolution, (patch: ThinInstancePatch) => {
    const distance = Vector3.Distance(patch.position, camera.position);
    return distance < patchSize * 3 ? 1 : 0;
});*/

const terrain = new Terrain(20, 16, (x, z) => {
    const height = Math.cos(x * 0.1) * Math.sin(z * 0.1) * 3

    const gradX = -Math.sin(x * 0.1) * Math.sin(z * 0.1) * 0.3;
    const gradZ = Math.cos(x * 0.1) * Math.cos(z * 0.1) * 0.3;

    const nx = -gradX;
    const ny = 1;
    const nz = -gradZ;

    return [height, nx, ny, nz];
}, scene);

const radius = 2;
for(let x = -radius; x <= radius; x++) {
    for(let z = -radius; z <= radius; z++) {
        const chunkPosition = new Vector3(x * 20, 0, z * 20);
        const chunk = terrain.createChunk(chunkPosition, 50);

        const grassPatch = new ThinInstancePatch(chunkPosition, chunk.instancesMatrixBuffer);
        grassPatch.createThinInstances(highQualityGrassBlade);

        const stride = 781;
        const cubeMatrixBuffer = downSample(chunk.instancesMatrixBuffer, stride);
        const cubePatch = new ThinInstancePatch(chunkPosition, cubeMatrixBuffer);
        cubePatch.createThinInstances(cube);
    }
}

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

    //ui.setText(`${grassPatch.getNbThinInstances().toLocaleString()} grass blades\n${cubePatch.getNbThinInstances().toLocaleString()} cubes | ${engine.getFps().toFixed(0)} FPS`);

    //ui.setText(`${grassScatterer.getNbThinInstances().toLocaleString()} grass blades\n${grassScatterer.getNbVertices().toLocaleString()} vertices | ${engine.getFps().toFixed(0)} FPS`);
    //grassScatterer.update(character.position);
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

