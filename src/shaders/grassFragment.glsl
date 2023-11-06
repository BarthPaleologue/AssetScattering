precision highp float;

uniform float time;

void main() {
    vec3 finalColor = vec3(0.0, 0.4, 0.0);

    gl_FragColor = vec4(finalColor, 1.0);// apply color and lighting
} 