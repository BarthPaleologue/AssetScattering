precision highp float;

attribute vec3 position;
attribute vec3 normal;

uniform mat4 view;
uniform mat4 projection;

uniform vec3 cameraPosition;

out vec3 vPosition;

out mat4 normalMatrix;
out vec3 vNormal1;
out vec3 vNormal2;

// rotation using https://www.wikiwand.com/en/Rodrigues%27_rotation_formula
vec3 rotateAround(vec3 vector, vec3 axis, float theta) {
    // Please note that unit vector are required, i did not divided by the norms
    return cos(theta) * vector + cross(axis, vector) * sin(theta) + axis * dot(axis, vector) * (1.0 - cos(theta));
}

float easeOut(float t, float a) {
    return 1.0 - pow(1.0 - t, a);
}

#include<instancesDeclaration>

void main() {
    #include<instancesVertex>

    // curvy normal
    float normalCurveAmount = 0.3 * 3.14;
    vec3 curvyNormal1 = rotateAround(normal, vec3(0.0, 1.0, 0.0), normalCurveAmount);
    vec3 curvyNormal2 = rotateAround(normal, vec3(0.0, 1.0, 0.0), -normalCurveAmount);

    // curved grass blade
    float leanAmount = 0.3;
    float curveAmount = leanAmount * position.y;
    vec3 leaningPosition = rotateAround(position, vec3(1.0, 0.0, 0.0), curveAmount);

    //vec3 leaningNormal = rotateAround(normal, vec3(1.0, 0.0, 0.0), curveAmount);
    vec3 leaningNormal1 = rotateAround(curvyNormal1, vec3(1.0, 0.0, 0.0), curveAmount);
    vec3 leaningNormal2 = rotateAround(curvyNormal2, vec3(1.0, 0.0, 0.0), curveAmount);

    vec3 worldPosition = (finalWorld * vec4(leaningPosition, 1.0)).xyz;

    /*vec3 viewDir = normalize(cameraPosition - worldPosition);
    float viewDotNormal = abs(dot(viewDir, leaningNormal));
    float viewSpaceThickenFactor = easeOut(1.0 - viewDotNormal, 4.0);*/

    //viewSpaceThickenFactor *= smoothstep(0.0, 0.2, viewDotNormal);

    vec4 viewPosition = view * vec4(worldPosition, 1.0);
    //viewPosition.x += viewSpaceThickenFactor * leaningNormal.y;

    vec4 outPosition = projection * viewPosition;
    gl_Position = outPosition;

    vPosition = position;

    normalMatrix = transpose(inverse(finalWorld));

    vNormal1 = leaningNormal1;
    vNormal2 = leaningNormal2;
}