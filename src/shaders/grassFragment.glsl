precision highp float;

uniform float time;

uniform vec3 lightDirection;

in vec3 vPosition;

in mat4 normalMatrix;
in vec3 vNormal1;
in vec3 vNormal2;

void main() {
    vec3 finalColor = vec3(0.0, 0.4, 0.0);

    float normalBlending = vPosition.x + 0.5;

    vec3 normal = mix(vNormal1, vNormal2, normalBlending);
    normal = normalize(normal);

    vec3 normalW = normalize((normalMatrix * vec4(normal, 0.0)).xyz);

    float ndl1 = max(dot(normalW, lightDirection), 0.0);
    float ndl2 = max(dot(-normalW, lightDirection), 0.0);
    float ndl = ndl1 + ndl2;

    // ambient lighting
    ndl = clamp(ndl + 0.1, 0.0, 1.0);

    gl_FragColor = vec4(finalColor * ndl, 1.0);// apply color and lighting
} 