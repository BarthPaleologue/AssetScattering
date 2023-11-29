struct Params {
    size: f32,
    resolution: u32,
    position: vec3<f32>,
};

@group(0) @binding(0) var<storage, read_write> instanceMatrices: array<f32>;
@group(0) @binding(1) var<uniform> params: Params;

// adapted from https://www.shadertoy.com/view/4djSRW
fn hash22(p: vec2<f32>) -> vec2<f32> {
	var p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx+33.33);
    return fract((p3.xx+p3.yz)*p3.zy);
}

fn hash12(p: vec2<f32>) -> f32 {
	var p3  = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

fn rotation_y(angle: f32) -> mat3x3<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return mat3x3<f32>(
        c, 0.0, s,
        0.0, 1.0, 0.0,
        -s, 0.0, c
    );
}

@compute @workgroup_size(1,1,1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let x: f32 = f32(id.x);
    let y: f32 = f32(id.y);

    let index: u32 = id.x + id.y * params.resolution;

    let cellSize = params.size / f32(params.resolution);
    let randomCellPosition = hash22(vec2<f32>(x, y)) * cellSize;
    let positionX = params.position.x + x * cellSize - params.size / 2.0 + randomCellPosition.x;
    let positionZ = params.position.z + y * cellSize - params.size / 2.0 + randomCellPosition.y;

    let scaling = 0.7 + hash12(vec2<f32>(x, y)) * 0.6;
    let angle_y = hash12(vec2<f32>(y, x)) * 6.28;

    let rotation = rotation_y(angle_y);

    let instanceMatrix: mat4x4<f32> = mat4x4<f32>(
        rotation[0][0] * scaling, rotation[1][0] * scaling, rotation[2][0] * scaling, positionX,
        rotation[0][1] * scaling, rotation[1][1] * scaling, rotation[2][1] * scaling, params.position.y,
        rotation[0][2] * scaling, rotation[1][2] * scaling, rotation[2][2] * scaling, positionZ,
        0.0, 0.0, 0.0, 1.0
    );

    // get instance counter value and then increment it by one (atomic)
    let offset = index * 16u;

    // write instance matrix to buffer
    instanceMatrices[offset + 0] = instanceMatrix[0][0];
    instanceMatrices[offset + 1] = instanceMatrix[1][0];
    instanceMatrices[offset + 2] = instanceMatrix[2][0];
    instanceMatrices[offset + 3] = instanceMatrix[3][0];

    instanceMatrices[offset + 4] = instanceMatrix[0][1];
    instanceMatrices[offset + 5] = instanceMatrix[1][1];
    instanceMatrices[offset + 6] = instanceMatrix[2][1];
    instanceMatrices[offset + 7] = instanceMatrix[3][1];

    instanceMatrices[offset + 8] = instanceMatrix[0][2];
    instanceMatrices[offset + 9] = instanceMatrix[1][2];
    instanceMatrices[offset + 10] = instanceMatrix[2][2];
    instanceMatrices[offset + 11] = instanceMatrix[3][2];

    instanceMatrices[offset + 12] = instanceMatrix[0][3];
    instanceMatrices[offset + 13] = instanceMatrix[1][3];
    instanceMatrices[offset + 14] = instanceMatrix[2][3];
    instanceMatrices[offset + 15] = instanceMatrix[3][3];
}