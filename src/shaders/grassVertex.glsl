precision highp float;

attribute vec3 position;
attribute vec3 normal;

uniform mat4 viewProjection;

#include<instancesDeclaration>

void main() {
    #include<instancesVertex>

    vec4 outPosition = viewProjection * finalWorld * vec4(position, 1.0);
    gl_Position = outPosition;
}