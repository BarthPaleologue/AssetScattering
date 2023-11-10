precision highp float;

uniform float time;

uniform vec3 lightDirection;

uniform sampler2D butterflyTexture;

in vec3 vPosition;
in vec2 vUV;

in mat4 normalMatrix;
in vec3 vNormal;

void main() {
    vec4 finalColor = texture(butterflyTexture, vUV);
    if(finalColor.a < 0.1) discard;

    vec3 normalW = normalize((normalMatrix * vec4(vNormal, 0.0)).xyz);

    float ndl1 = max(dot(normalW, lightDirection), 0.0);
    float ndl2 = max(dot(-normalW, lightDirection), 0.0);
    float ndl = ndl1 + ndl2;

    // ambient lighting
    ndl = clamp(ndl + 0.1, 0.0, 1.0);

    gl_FragColor = vec4(finalColor.rgb * ndl, 1.0);// apply color and lighting
} 