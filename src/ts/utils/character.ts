import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";

import character from "../../assets/character.glb";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import "@babylonjs/core/Animations/animatable";
import "@babylonjs/core/Culling/ray";

import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { PhysicsRaycastResult } from "@babylonjs/core/Physics/physicsRaycastResult";
import { PhysicsEngineV2 } from "@babylonjs/core/Physics/v2";
import { ActionManager, ExecuteCodeAction } from "@babylonjs/core/Actions";
import { setUpVector } from "./algebra";

export async function createCharacterController(scene: Scene, camera: ArcRotateCamera, planet = false): Promise<AbstractMesh> {
    const result = await SceneLoader.ImportMeshAsync("", "", character, scene);

    const hero = result.meshes[0];

    const cameraAttachPoint = new TransformNode("cameraAttachPoint", scene);
    cameraAttachPoint.parent = hero;
    cameraAttachPoint.position = new Vector3(0, 1.5, 0);

    camera.lockedTarget = cameraAttachPoint;
    camera.wheelPrecision = 200;
    camera.lowerRadiusLimit = 3;
    camera.upperBetaLimit = 3.14 / 2;

    //Scale the model down
    //Hero character variables
    const heroSpeed = 1.8;
    const heroSpeedBackwards = 1.2;
    const heroRotationSpeed = 6;

    let animating = true;

    const walkAnim = scene.getAnimationGroupByName("Walking");
    if (walkAnim === null) throw new Error("'Walking' animation not found");
    const walkBackAnim = scene.getAnimationGroupByName("WalkingBackwards");
    if (walkBackAnim === null) throw new Error("'WalkingBackwards' animation not found");
    const idleAnim = scene.getAnimationGroupByName("Idle");
    if (idleAnim === null) throw new Error("'Idle' animation not found");
    const sambaAnim = scene.getAnimationGroupByName("SambaDancing");
    if (sambaAnim === null) throw new Error("'Samba' animation not found");

    const inputMap: Map<string, boolean> = new Map<string, boolean>();
    scene.actionManager = new ActionManager(scene);
    scene.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (e) => {
            inputMap.set(e.sourceEvent.key, e.sourceEvent.type == "keydown");
        })
    );
    scene.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (e) => {
            inputMap.set(e.sourceEvent.key, e.sourceEvent.type == "keydown");
        })
    );

    const raycastResult = new PhysicsRaycastResult();

    //FIXME when the position is 0 then character cannot be rotated (this makes no sense)
    hero.position = new Vector3(0, 0.000000001, 0);

    //Rendering loop (executed for everyframe)
    scene.onBeforePhysicsObservable.add(() => {
        const deltaTime = scene.getEngine().getDeltaTime() / 1000;
        let keydown = false;
        //Manage the movements of the character (e.g. position, direction)
        if (inputMap.get("z") || inputMap.get("w")) {
            hero.moveWithCollisions(hero.forward.scaleInPlace(heroSpeed * deltaTime));
            keydown = true;
        }
        if (inputMap.get("s")) {
            hero.moveWithCollisions(hero.forward.scaleInPlace(-heroSpeedBackwards * deltaTime));
            keydown = true;
        }
        if (inputMap.get("q") || inputMap.get("a")) {
            hero.rotate(Vector3.Up(), -heroRotationSpeed * deltaTime);
            keydown = true;
        }
        if (inputMap.get("d")) {
            hero.rotate(Vector3.Up(), heroRotationSpeed * deltaTime);
            keydown = true;
        }
        if (inputMap.get("b")) {
            keydown = true;
        }

        //Manage animations to be played
        if (keydown) {
            if (!animating) {
                animating = true;
                if (inputMap.get("s")) {
                    //Walk backwards
                    walkBackAnim.start(true, 1, walkBackAnim.from, walkBackAnim.to, false);
                } else if (inputMap.get("b")) {
                    //Samba!
                    sambaAnim.start(true, 1, sambaAnim.from, sambaAnim.to, false);
                } else {
                    //Walk
                    walkAnim.start(true, 1, walkAnim.from, walkAnim.to, true);
                }
            }
        } else {
            if (animating) {
                //Default animation is idle when no key is down
                idleAnim.start(true, 1, idleAnim.from, idleAnim.to, false);

                //Stop all animations besides Idle Anim when no key is down
                sambaAnim.stop();
                walkAnim.stop();
                walkBackAnim.stop();

                //Ensure animation are played only once per rendering loop
                animating = false;
            }
        }

        if (planet) {
            setUpVector(hero, hero.position.normalizeToNew());
            camera.upVector = hero.up;
        }

        // downward raycast
        const start = hero.position.add(hero.up.scale(50));
        const end = hero.position.add(hero.up.scale(-50));
        (scene.getPhysicsEngine() as PhysicsEngineV2).raycastToRef(start, end, raycastResult);
        if (raycastResult.hasHit) {
            hero.position = raycastResult.hitPointWorld.add(hero.up.scale(0.01));
        }
    });

    return hero;
}
