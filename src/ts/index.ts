import {Engine} from "@babylonjs/core/Engines/engine";
import {Scene} from "@babylonjs/core/scene";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {Texture} from "@babylonjs/core/Materials/Textures/texture";
import "@babylonjs/core/Loading/loadingScreen";

import "../styles/index.scss";
import {createGrassBlade} from "./grassBlade";
import {ArcRotateCamera, DirectionalLight, MeshBuilder, StandardMaterial} from "@babylonjs/core";
import {createGrassMaterial} from "./grassMaterial";

import perlinNoise from "../assets/perlin.png";
import {ThinInstanceScatterer} from "./thinInstanceScatterer";
import {createSkybox} from "./skybox";
import {UI} from "./ui";

const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const engine = new Engine(canvas);
engine.displayLoadingUI();

const scene = new Scene(engine);

const camera = new ArcRotateCamera("camera", 0, 1.4, 15, Vector3.Zero(), scene);
camera.lowerRadiusLimit = 3;
camera.upperBetaLimit = 3.14 / 2 - 0.1;
camera.minZ = 0.1;
camera.attachControl();

const light = new DirectionalLight("light", new Vector3(-5, 5, 10).negateInPlace().normalize(), scene);

createSkybox(scene, light.direction.scale(-1));

const perlinTexture = new Texture(perlinNoise, scene);

const highQualityGrassBlade = createGrassBlade(scene, 4);

const material = createGrassMaterial(scene);
material.setVector3("lightDirection", light.direction);
material.setTexture("perlinNoise", perlinTexture);
highQualityGrassBlade.material = material;

const patchSize = 10;
const patchResolution = 50;
const fieldRadius = 9;

/*const bladeMeshFromLod = new Array<Mesh>(2);
bladeMeshFromLod[0] = lowQualityGrassBlade;
bladeMeshFromLod[1] = highQualityGrassBlade;*/

const grassScatterer = new ThinInstanceScatterer(highQualityGrassBlade, fieldRadius, patchSize, patchResolution);

const ground = MeshBuilder.CreateGround("ground", {
    width: patchSize * (fieldRadius + 1) * 2,
    height: patchSize * (fieldRadius + 1) * 2
}, scene);

const groundMaterial = new StandardMaterial("groundMaterial", scene);
groundMaterial.diffuseColor.set(0.4, 0.3, 0.3);
groundMaterial.specularColor.set(0, 0, 0);
ground.material = groundMaterial;

const ui = new UI(scene);

let clock = 0;

function updateScene() {
    const deltaTime = engine.getDeltaTime() / 1000;
    clock += deltaTime;

    material.setVector3("cameraPosition", camera.position);
    material.setFloat("time", clock);

    ui.setText(`${grassScatterer.getNbThinInstances().toLocaleString()} grass blades | ${engine.getFps().toFixed(0)} FPS`);

    grassScatterer.update();
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

