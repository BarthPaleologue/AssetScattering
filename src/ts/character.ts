import {SceneLoader} from "@babylonjs/core/Loading/sceneLoader";
import {Scene} from "@babylonjs/core/scene";
import {ArcRotateCamera} from "@babylonjs/core/Cameras/arcRotateCamera";

import character from "../assets/character.glb";
import {Vector3} from "@babylonjs/core/Maths/math.vector";

import "@babylonjs/loaders/glTF/2.0/glTFLoader";

export function createCharacterController(scene: Scene, camera: ArcRotateCamera, inputMap: Map<string, boolean>): void {
    SceneLoader.ImportMesh("", "", character, scene, function (newMeshes, particleSystems, skeletons, animationGroups) {
        const hero = newMeshes[0];

        //Scale the model down
        
        //Hero character variables
        const heroSpeed = 0.03;
        const heroSpeedBackwards = 0.02;
        const heroRotationSpeed = 0.1;

        let animating = true;

        const walkAnim = scene.getAnimationGroupByName("Walking");
        if(walkAnim === null) throw new Error("'Walking' animation not found");
        const walkBackAnim = scene.getAnimationGroupByName("WalkingBackwards");
        if(walkBackAnim === null) throw new Error("'WalkingBackwards' animation not found");
        const idleAnim = scene.getAnimationGroupByName("Idle");
        if(idleAnim === null) throw new Error("'Idle' animation not found");
        const sambaAnim = scene.getAnimationGroupByName("SambaDancing");
        if(sambaAnim === null) throw new Error("'Samba' animation not found");

        //Rendering loop (executed for everyframe)
        scene.onBeforeRenderObservable.add(() => {

            camera.setTarget(hero.position.add(new Vector3(0, 1, 0)));

            let keydown = false;
            //Manage the movements of the character (e.g. position, direction)
            if (inputMap.get("z")) {
                hero.moveWithCollisions(hero.forward.scaleInPlace(-heroSpeed));
                keydown = true;
            }
            if (inputMap.get("s")) {
                hero.moveWithCollisions(hero.forward.scaleInPlace(heroSpeedBackwards));
                keydown = true;
            }
            if (inputMap.get("q")) {
                hero.rotate(Vector3.Up(), heroRotationSpeed);
                keydown = true;
            }
            if (inputMap.get("d")) {
                hero.rotate(Vector3.Up(), -heroRotationSpeed);
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
                        walkBackAnim.start(true, 1.0, walkBackAnim.from, walkBackAnim.to, false);
                    }
                    else if
                    (inputMap.get("b")) {
                        //Samba!
                        sambaAnim.start(true, 1.0, sambaAnim.from, sambaAnim.to, false);
                    }
                    else {
                        //Walk
                        walkAnim.start(true, 1.0, walkAnim.from, walkAnim.to, true);
                    }
                }
            }
            else {

                if (animating) {
                    //Default animation is idle when no key is down
                    idleAnim.start(true, 1.0, idleAnim.from, idleAnim.to, false);

                    //Stop all animations besides Idle Anim when no key is down
                    sambaAnim.stop();
                    walkAnim.stop();
                    walkBackAnim.stop();

                    //Ensure animation are played only once per rendering loop
                    animating = false;
                }
            }
        });
    });
}