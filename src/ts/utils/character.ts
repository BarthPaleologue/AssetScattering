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
import { AnimationGroup } from "@babylonjs/core";

class AnimationGroupWrapper {
    name: string;
    group: AnimationGroup;
    weight: number;

    constructor(name: string, group: AnimationGroup, startingWeight: number) {
        this.name = name;
        this.weight = startingWeight;

        this.group = group;
        this.group.play(true);
        this.group.setWeightForAllAnimatables(startingWeight);
    }

    moveTowardsWeight(targetWeight: number, deltaTime: number) {
        this.weight = Math.min(Math.max(this.weight + deltaTime * Math.sign(targetWeight - this.weight), 0), 1);
        this.group.setWeightForAllAnimatables(this.weight);
    }
}


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

    //let animating = true;

    const walkAnimGroup = scene.getAnimationGroupByName("Walking");
    if (walkAnimGroup === null) throw new Error("'Walking' animation not found");
    const walkAnim = new AnimationGroupWrapper("Walking", walkAnimGroup, 0);

    const walkBackAnimGroup = scene.getAnimationGroupByName("WalkingBackwards");
    if (walkBackAnimGroup === null) throw new Error("'WalkingBackwards' animation not found");
    const walkBackAnim = new AnimationGroupWrapper("WalkingBackwards", walkBackAnimGroup, 0);

    const idleAnimGroup = scene.getAnimationGroupByName("Idle");
    if (idleAnimGroup === null) throw new Error("'Idle' animation not found");
    const idleAnim = new AnimationGroupWrapper("Idle", idleAnimGroup, 1);

    const sambaAnimGroup = scene.getAnimationGroupByName("SambaDancing");
    if (sambaAnimGroup === null) throw new Error("'Samba' animation not found");
    const sambaAnim = new AnimationGroupWrapper("SambaDancing", sambaAnimGroup, 0);

    let targetAnim = idleAnim;
    const nonIdleAnimations = [walkAnim, walkBackAnim, sambaAnim];

    function setTargetAnimation(animation: AnimationGroupWrapper) {
        targetAnim = animation;
    }

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

    if(planet) {
        //FIXME when the position is 0 then character cannot be rotated (this makes no sense)
        hero.position = new Vector3(0, 0.000000001, 0);
    }
    
    //Rendering loop (executed for everyframe)
    scene.onBeforePhysicsObservable.add(() => {
        const deltaTime = scene.getEngine().getDeltaTime() / 1000;
        let keydown = false;

        if (walkAnim.weight > 0.0) {
            hero.moveWithCollisions(hero.forward.scaleInPlace(heroSpeed * deltaTime * walkAnim.weight));
        }

        if (walkBackAnim.weight > 0.0) {
            hero.moveWithCollisions(hero.forward.scaleInPlace(-heroSpeedBackwards * deltaTime * walkBackAnim.weight));
        }

        const isWalking = walkAnim.weight > 0.0 || walkBackAnim.weight > 0.0;

        // Translation
        if (inputMap.get("z") || inputMap.get("w")) {
            setTargetAnimation(walkAnim);
            keydown = true;
        } else if (inputMap.get("s")) {
            setTargetAnimation(walkBackAnim);
            keydown = true;
        }

        // Rotation
        if ((inputMap.get("q") || inputMap.get("a")) && isWalking) {
            hero.rotate(Vector3.Up(), -heroRotationSpeed * deltaTime);
            keydown = true;
        } else if (inputMap.get("d") && isWalking) {
            hero.rotate(Vector3.Up(), heroRotationSpeed * deltaTime);
            keydown = true;
        }

        // Samba!
        if (inputMap.get("b")) {
            setTargetAnimation(sambaAnim);
            keydown = true;
        }

        if (!keydown) {
            setTargetAnimation(idleAnim);
        }

        let weightSum = 0;
        for (const animation of nonIdleAnimations) {
            if (animation === targetAnim) {
                animation.moveTowardsWeight(1, deltaTime);
            } else {
                animation.moveTowardsWeight(0, deltaTime);
            }
            weightSum += animation.weight;
        }

        idleAnim.moveTowardsWeight(1 - weightSum, deltaTime);

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
