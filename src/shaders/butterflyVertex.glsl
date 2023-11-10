precision highp float;

in vec3 position;
in vec3 normal;
in vec2 uv;

uniform mat4 viewProjection;

//uniform mat4 world;

uniform vec3 playerPosition;

uniform float time;

out vec3 vPosition;
out vec2 vUV;

out mat4 normalMatrix;
out vec3 vNormal;

out vec3 vOriginalWorldPosition;

// rotation using https://www.wikiwand.com/en/Rodrigues%27_rotation_formula
vec3 rotateAround(vec3 vector, vec3 axis, float theta) {
    // Please note that unit vector are required, i did not divided by the norms
    return cos(theta) * vector + cross(axis, vector) * sin(theta) + axis * dot(axis, vector) * (1.0 - cos(theta));
}

float easeOut(float t, float a) {
    return 1.0 - pow(1.0 - t, a);
}

float easeIn(float t, float alpha) {
    return pow(t, alpha);
}

#pragma glslify: remap = require(./remap.glsl)

#include<instancesDeclaration>

void main() {
    #include<instancesVertex>

    vec3 objectWorld = vec3(finalWorld[3].x, finalWorld[3].y, finalWorld[3].z);
    vOriginalWorldPosition = objectWorld;

    // high frequency movement for wing flap
    objectWorld.y += 0.1 * sin(5.0 * time + objectWorld.x * 10.0 + objectWorld.z * 10.0);
    // low frequency movement of larger amplitude for general movement
    objectWorld.y += 0.5 * sin(0.2 * time + objectWorld.x * 15.0 + objectWorld.z * 15.0);

    vec3 butterflyForward = vec3(1.0, 0.0, 0.0);

    float rotationY = sin(0.5 * time + vOriginalWorldPosition.x * 10.0 + vOriginalWorldPosition.z * 10.0) * 3.14;
    vec3 rotatedPosition = rotateAround(position, vec3(0.0, 1.0, 0.0), rotationY);
    butterflyForward = rotateAround(butterflyForward, vec3(0.0, 1.0, 0.0), rotationY);

    vec3 flyPosition = rotateAround(rotatedPosition, butterflyForward, sign(position.z) * cos(10.0 * time + objectWorld.x * 10.0 + objectWorld.z * 10.0));

    objectWorld += butterflyForward * 0.5 * sin(0.5 * time + vOriginalWorldPosition.x * 10.0 + vOriginalWorldPosition.z * 10.0);

    // avoid the player
    vec3 playerToButterfly = objectWorld - playerPosition;
    playerToButterfly.y = 0.0;
    float distanceToPlayer = length(playerToButterfly);
    if (distanceToPlayer < 2.0) {
        objectWorld += normalize(playerToButterfly) * (2.0 - distanceToPlayer);
    }

    finalWorld[3].xyz = objectWorld;

    vec4 outPosition = viewProjection * finalWorld * vec4(flyPosition, 1.0);
    gl_Position = outPosition;

    vPosition = flyPosition;
    vUV = uv;

    normalMatrix = transpose(inverse(finalWorld));

    vNormal = normal;
}