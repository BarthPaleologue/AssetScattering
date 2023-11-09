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
import {PatchManager} from "./patchManager";
import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {downSample} from "./utils/matrixBuffer";
import {Terrain} from "./terrain/terrain";

import HavokPhysics from "@babylonjs/havok";
import {HavokPlugin} from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import {PhysicsShapeType} from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import {PhysicsAggregate} from "@babylonjs/core/Physics/v2/physicsAggregate";
import {IPatch} from "./iPatch";
import {InstancePatch} from "./instancePatch";

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

const terrainChunkSize = 20;

const bladeMeshFromLod = new Array<Mesh>(2);
bladeMeshFromLod[0] = lowQualityGrassBlade;
bladeMeshFromLod[1] = highQualityGrassBlade;

const grassScatterer = new PatchManager(bladeMeshFromLod, (patch: IPatch) => {
    const distance = Vector3.Distance(patch.getPosition(), camera.position);
    return distance < terrainChunkSize * 3 ? 1 : 0;
});
const cubeScatterer = new PatchManager([cube]);

/*const patchSize = 10;
const patchResolution = patchSize * 5;
const fieldRadius = 17;
grassScatterer.addPatches(ThinInstanceScatterer.circleInit(fieldRadius, patchSize, patchResolution));*/

const terrain = new Terrain(20, 16, (x, z) => {
    const heightMultiplier = 5;
    const frequency = 0.1;
    const height = Math.cos(x * frequency) * Math.sin(z * frequency) * heightMultiplier;
    const gradX = -Math.sin(x * frequency) * Math.sin(z * frequency) * frequency * heightMultiplier;
    const gradZ = Math.cos(x * frequency) * Math.cos(z * frequency) * frequency * heightMultiplier;

    return [height, gradX, gradZ];
}, scene);

const radius = 2;
for (let x = -radius; x <= radius; x++) {
    for (let z = -radius; z <= radius; z++) {
        const chunkPosition = new Vector3(x * 20, 0, z * 20);
        const chunk = terrain.createChunk(chunkPosition, 50);

        const grassPatch = new ThinInstancePatch(chunkPosition, chunk.instancesMatrixBuffer);
        grassScatterer.addPatch(grassPatch);

        const stride = 781;
        const cubeMatrixBuffer = downSample(chunk.alignedInstancesMatrixBuffer, stride);
        const cubePatch = new InstancePatch(chunkPosition, cubeMatrixBuffer);
        cubeScatterer.addPatch(cubePatch);

        /*scene.onBeforeRenderObservable.add(() => {
            if(cubePatch.getMesh().getBoundingInfo().intersects(character.getBoundingInfo(), true)) {
                console.log("collision");
            }
        });*/
    }
}

grassScatterer.initInstances();
cubeScatterer.initInstances();

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

    ui.setText(`${grassScatterer.getNbInstances().toLocaleString()} grass blades\n${cubeScatterer.getNbInstances().toLocaleString()} cubes | ${engine.getFps().toFixed(0)} FPS`);

    //ui.setText(`${grassScatterer.getNbThinInstances().toLocaleString()} grass blades\n${grassScatterer.getNbVertices().toLocaleString()} vertices | ${engine.getFps().toFixed(0)} FPS`);

    grassScatterer.update(camera.position);
    cubeScatterer.update(camera.position);
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

