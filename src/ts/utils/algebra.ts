import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";

export function getTransformationQuaternion(from: Vector3, to: Vector3): Quaternion {
    const rotationAxis = Vector3.Cross(from, to);
    const angle = Math.acos(Vector3.Dot(from, to));
    return Quaternion.RotationAxis(rotationAxis, angle);
}

export function setUpVector(transformNode: TransformNode, newUpVector: Vector3) {
    const currentUpVector = transformNode.up;
    const rotationQuaternion = getTransformationQuaternion(currentUpVector, newUpVector);
    if(transformNode.rotationQuaternion === null) transformNode.rotationQuaternion = rotationQuaternion;
    else transformNode.rotationQuaternion = rotationQuaternion.multiply(transformNode.rotationQuaternion);
}