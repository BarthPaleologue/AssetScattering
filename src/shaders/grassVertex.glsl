precision highp float;

attribute vec3 position;
attribute vec3 normal;

uniform mat4 viewProjection;

// rotation using https://www.wikiwand.com/en/Rodrigues%27_rotation_formula
vec3 rotateAround(vec3 vector, vec3 axis, float theta) {
    // Please note that unit vector are required, i did not divided by the norms
    return cos(theta) * vector + cross(axis, vector) * sin(theta) + axis * dot(axis, vector) * (1.0 - cos(theta));
}

#include<instancesDeclaration>

void main() {
    #include<instancesVertex>

    float leanAmount = 0.3;
    float curveAmount = leanAmount * position.y;
    vec3 rotatedPosition = rotateAround(position, vec3(1.0, 0.0, 0.0), curveAmount);

    vec4 outPosition = viewProjection * finalWorld * vec4(rotatedPosition, 1.0);
    gl_Position = outPosition;
}