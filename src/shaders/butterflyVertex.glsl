precision highp float;

in vec3 position;
in vec3 normal;
in vec2 uv;

uniform mat4 viewProjection;

//uniform mat4 world;

uniform vec3 cameraPosition;
uniform vec3 playerPosition;

uniform float time;

uniform sampler2D perlinNoise;

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

    //mat4 finalWorld = world;

    // wind //world3.xyz;
    /*vec3 objectWorld = vec3(finalWorld[3].x, finalWorld[3].y, finalWorld[3].z);
    float windStrength = texture2D(perlinNoise, objectWorld.xz * 0.007 + 0.1 * time).r;
    float windDir = texture2D(perlinNoise, objectWorld.xz * 0.005 + 0.05 * time).r * 2.0 * 3.14;

    float windLeanAngle = remap(windStrength, 0.0, 1.0, 0.25, 1.0);
    windLeanAngle = easeIn(windLeanAngle, 2.0) * 0.75;

    // curved grass blade
    float leanAmount = 0.3;
    float curveAmount = leanAmount * position.y;
    float objectDistance = length(objectWorld - playerPosition);

    // account for player presence
    vec3 playerDirection = (objectWorld - playerPosition) / objectDistance;
    float maxDistance = 3.0;
    float distance01 = objectDistance / maxDistance;
    float influence = 1.0 + 8.0 * smoothstep(0.0, 1.0, 1.0 - distance01);
    curveAmount *= influence;
    curveAmount += windLeanAngle * smoothstep(0.2, 1.0, distance01);

    vec3 leanAxis = rotateAround(vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), windDir * smoothstep(0.2, 1.0, distance01));
    leanAxis = normalize(mix(cross(vec3(0.0, 1.0, 0.0), playerDirection), leanAxis, smoothstep(0.0, 1.0, 1.0 - distance01)));


    vec3 leaningPosition = rotateAround(position, leanAxis, curveAmount);

    vec3 leaningNormal = rotateAround(normal, leanAxis, curveAmount);*/

    vec3 objectWorld = vec3(finalWorld[3].x, finalWorld[3].y, finalWorld[3].z);
    vOriginalWorldPosition = objectWorld;

    // high frequency movement for wing flap
    objectWorld.y += 0.1 * sin(5.0 * time + objectWorld.x * 10.0 + objectWorld.z * 10.0);
    // low frequency movement of larger amplitude for general movement
    objectWorld.y += 0.5 * sin(0.2 * time + objectWorld.x * 15.0 + objectWorld.z * 15.0);


    vec3 flyPosition = rotateAround(position, vec3(1.0, 0.0, 0.0), sign(position.z) * cos(10.0 * time + objectWorld.x * 10.0 + objectWorld.z * 10.0));

    finalWorld[3].xyz = objectWorld;

    vec4 outPosition = viewProjection * finalWorld * vec4(flyPosition, 1.0);
    gl_Position = outPosition;

    vPosition = flyPosition;
    vUV = uv;

    normalMatrix = transpose(inverse(finalWorld));

    vNormal = normal;
}