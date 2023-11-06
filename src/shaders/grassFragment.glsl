precision highp float;

uniform float time;

uniform vec3 lightDirection;

in vec3 vPosition;

in mat4 normalMatrix;
in vec3 vNormal1;
in vec3 vNormal2;

float easeIn(float t, float alpha) {
    return pow(t, alpha);
}

void main() {
    vec3 baseColor = vec3(0.05, 0.2, 0.01);
    vec3 tipColor = vec3(0.5, 0.5, 0.1);

    vec3 finalColor = mix(baseColor, tipColor, easeIn(vPosition.y, 4.0));

    float normalBlending = vPosition.x + 0.5;

    vec3 normal = mix(vNormal1, vNormal2, normalBlending);
    normal = normalize(normal);

    vec3 normalW = normalize((normalMatrix * vec4(normal, 0.0)).xyz);

    float ndl1 = max(dot(normalW, lightDirection), 0.0);
    float ndl2 = max(dot(-normalW, lightDirection), 0.0);
    float ndl = ndl1 + ndl2;

    // ambient lighting
    ndl = clamp(ndl + 0.1, 0.0, 1.0);

    float density = 0.2;
    float aoForDensity = mix(1.0, 0.25, density);
    float ao = mix(aoForDensity, 1.0, easeIn(vPosition.y, 2.0));

    gl_FragColor = vec4(finalColor * ndl * ao, 1.0);// apply color and lighting
} 