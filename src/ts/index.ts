import {Engine} from "@babylonjs/core/Engines/engine";
import {Scene} from "@babylonjs/core/scene";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {MeshBuilder} from "@babylonjs/core/Meshes/meshBuilder";
/*import { Effect } from "@babylonjs/core/Materials/effect";
import { PostProcess } from "@babylonjs/core/PostProcesses/postProcess";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";*/
import {PointLight} from "@babylonjs/core/Lights/pointLight";
import {InstancedMesh} from "@babylonjs/core/Meshes/instancedMesh";
import {Texture} from "@babylonjs/core/Materials/Textures/texture";
import "@babylonjs/core/Loading/loadingScreen";

import "../styles/index.scss";
import {makeGrassBlade} from "./grassBlade";
import {StandardMaterial} from "@babylonjs/core/Materials/standardMaterial";
import {ArcRotateCamera, DirectionalLight} from "@babylonjs/core";
import {makeGrassMaterial} from "./grassMaterial";
import {InstancePatch} from "./instancePatch";

import perlinNoise from "../assets/perlin.png";
import {Mesh} from "@babylonjs/core/Meshes/mesh";

//import postprocessCode from "../shaders/smallPostProcess.glsl";

const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const engine = new Engine(canvas);

const scene = new Scene(engine);

const camera = new ArcRotateCamera("camera", 3.14 / 2, 1, 15, Vector3.Zero(), scene);
camera.lowerRadiusLimit = 1;
camera.attachControl();

const light = new DirectionalLight("light", new Vector3(-5, 5, 10).negateInPlace().normalize(), scene);

const highQualityGrassBlade = makeGrassBlade(scene, 4);
highQualityGrassBlade.isVisible = false;

const lowQualityGrassBlade = makeGrassBlade(scene, 2);
lowQualityGrassBlade.isVisible = false;

const material = makeGrassMaterial(scene);
material.setVector3("lightDirection", light.direction);
material.setTexture("perlinNoise", new Texture(perlinNoise, scene));
highQualityGrassBlade.material = material;
lowQualityGrassBlade.material = material;

const patchSize = 10;
const patchResolution = 50;
const fieldPosition = new Vector3(0, 0, 0);
const fieldRadius = 3;

function computeLodLevel(distance: number, patchSize: number) {
    return distance < patchSize * 2 ? 1 : 0;
}

const bladeMeshFromLod = new Array<Mesh>(2);
bladeMeshFromLod[0] = lowQualityGrassBlade;
bladeMeshFromLod[1] = highQualityGrassBlade;

const map = new Map<Vector3, InstancePatch>();

for (let x = -fieldRadius; x <= fieldRadius; x++) {
    for (let z = -fieldRadius; z <= fieldRadius; z++) {
        const radiusSquared = x * x + z * z;
        if (radiusSquared > fieldRadius * fieldRadius) continue;

        const patchPosition = new Vector3(x * patchSize, 0, z * patchSize).addInPlace(fieldPosition);
        const lodLevel = computeLodLevel(Vector3.Distance(patchPosition, camera.position), patchSize);

        const patch = new InstancePatch(bladeMeshFromLod, lodLevel, patchPosition, patchSize, patchResolution);

        map.set(patchPosition, patch);
    }
}

//Effect.ShadersStore[`PostProcess1FragmentShader`] = postprocessCode;
//const postProcess = new PostProcess("postProcess1", "PostProcess1", [], ["textureSampler"], 1, camera, Texture.BILINEAR_SAMPLINGMODE, engine);

let clock = 0;

function swap(oldInstance: InstancedMesh, newInstance: InstancedMesh) {
    newInstance.position.copyFrom(oldInstance.position);
    newInstance.rotation.copyFrom(oldInstance.rotation);
    newInstance.scaling.copyFrom(oldInstance.scaling);
    oldInstance.dispose();
}

function updateScene() {
    const deltaTime = engine.getDeltaTime() / 1000;
    clock += deltaTime;

    material.setVector3("cameraPosition", camera.position);
    material.setFloat("time", clock);

    // update grass LOD
    for (const patchPosition of map.keys()) {
        const distanceToCamera = Vector3.Distance(patchPosition, camera.position);
        const patch = map.get(patchPosition);
        if (!patch) {
            throw new Error("Patch data not found");
        }

        const newLod = computeLodLevel(distanceToCamera, patchSize);
        if (newLod === patch.lod) continue;

        const newInstances = [];
        for (const instance of patch.instances) {
            const bladeType = bladeMeshFromLod[newLod];
            const newInstance = bladeType.createInstance(instance.name);
            swap(instance, newInstance);
            newInstances.push(newInstance);
        }

        patch.instances = newInstances;
        patch.lod = newLod;
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

