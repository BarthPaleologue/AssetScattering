struct Params {
    scatterPerSquareMeter : f32,
    nbVerticesPerRow : u32,
    position: vec3<f32>
};

struct FloatArray {
  elements : array<f32>,
};
struct UIntArray {
  elements : array<atomic<u32>>,
};

@group(0) @binding(0) var<storage, read> positions : FloatArray;
@group(0) @binding(1) var<storage, read> normals : FloatArray;
@group(0) @binding(2) var<storage, read_write> indices : UIntArray;
@group(0) @binding(3) var<storage, read_write> instanceMatrices : FloatArray;
@group(0) @binding(4) var<storage, read_write> alignedInstanceMatrices : FloatArray;
@group(0) @binding(5) var<storage, read_write> instanceCounter : atomic<u32>;
@group(0) @binding(6) var<uniform> params : Params;

fn triangle_area(a : vec3<f32>, b : vec3<f32>, c : vec3<f32>) -> f32 {
    let ab : vec3<f32> = b - a;
    let ac : vec3<f32> = c - a;
    let cross : vec3<f32> = cross(ab, ac);
    return length(cross) * 0.5;
}

// adapted from https://www.shadertoy.com/view/4djSRW
fn hash13(_p3: vec3<f32>) -> f32 {
	var p3  = fract(_p3 * .1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}

// adapted from https://www.shadertoy.com/view/4djSRW
fn hash22(p: vec2<f32>) -> vec2<f32> {
	var p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx+33.33);
    return fract((p3.xx+p3.yz)*p3.zy);
}

fn hash23(p: vec3<f32>) -> vec2<f32> {
	var p3 = fract(p * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx+33.33);
    return fract((p3.xx+p3.yz)*p3.zy);
}

fn rotation_matrix_from_to(src: vec3<f32>, dest: vec3<f32>) -> mat3x3<f32> {
    let axis: vec3<f32> = normalize(cross(src, dest));
    let angle: f32 = acos(dot(src, dest));
    let c: f32 = cos(angle);
    let s: f32 = sin(angle);
    let t: f32 = 1.0 - c;

    let x = axis.x;
    let y = axis.y;
    let z = axis.z;

    let xs = x * s;
    let ys = y * s;
    let zs = z * s;

    let txy = t * x * y;
    let txz = t * x * z;
    let tyz = t * y * z;

    let txx = t * x * x;
    let tyy = t * y * y;
    let tzz = t * z * z;

    return mat3x3<f32>(
       txx + c, txy + zs, txz - ys,
       txy - zs, tyy + c, tyz + xs,
       txz + ys, tyz - xs, tzz + c
    );
}

@compute @workgroup_size(1,1,1)
fn main(@builtin(global_invocation_id) id : vec3<u32>) {
    let x : f32 = f32(id.x);
    let y : f32 = f32(id.y);
    let z : f32 = f32(id.z);

    let nbSubdivisions: u32 = params.nbVerticesPerRow - 1;

    let quadIndex: u32 = (id.x) + (id.y) * nbSubdivisions;
    let triangleIndexInQuad: u32 = id.z; // 0 or 1

    // get first triangle index
    let index = quadIndex * 6 + triangleIndexInQuad * 3;

    let index0: u32 = atomicLoad(&indices.elements[index + 0]);
    let index1: u32 = atomicLoad(&indices.elements[index + 1]);
    let index2: u32 = atomicLoad(&indices.elements[index + 2]);

    let position0: vec3<f32> = vec3<f32>(positions.elements[index0 * 3 + 0], positions.elements[index0 * 3 + 1], positions.elements[index0 * 3 + 2]);
    let position1: vec3<f32> = vec3<f32>(positions.elements[index1 * 3 + 0], positions.elements[index1 * 3 + 1], positions.elements[index1 * 3 + 2]);
    let position2: vec3<f32> = vec3<f32>(positions.elements[index2 * 3 + 0], positions.elements[index2 * 3 + 1], positions.elements[index2 * 3 + 2]);

    let triangle_center: vec3<f32> = (position0 + position1 + position2) / 3.0;

    let area: f32 = triangle_area(position0, position1, position2);

    var nbInstances: u32 = u32(area * params.scatterPerSquareMeter);
    let residual: f32 = area * params.scatterPerSquareMeter - f32(nbInstances);

    // randomly add one more instance
    if (hash13(triangle_center + params.position) < residual) {
        nbInstances = nbInstances + 1;
    }

    let normal0: vec3<f32> = vec3<f32>(normals.elements[index0 * 3 + 0], normals.elements[index0 * 3 + 1], normals.elements[index0 * 3 + 2]);
    let normal1: vec3<f32> = vec3<f32>(normals.elements[index1 * 3 + 0], normals.elements[index1 * 3 + 1], normals.elements[index1 * 3 + 2]);
    let normal2: vec3<f32> = vec3<f32>(normals.elements[index2 * 3 + 0], normals.elements[index2 * 3 + 1], normals.elements[index2 * 3 + 2]);

    for (var i: u32 = 0; i < nbInstances; i = i + 1) {
        let in_triangle_coords: vec2<f32> = hash23(vec3<f32>(x, y, f32(i)) + triangle_center + params.position);

        let interp1 = in_triangle_coords.x;
        let interp2 = in_triangle_coords.y;

        let f0 = 1.0 - sqrt(interp1);
        let f1 = sqrt(interp1) * (1.0 - interp2);
        let f2 = sqrt(interp1) * interp2;

        let position: vec3<f32> = f0 * position0 + f1 * position1 + f2 * position2 + params.position;
        let normal: vec3<f32> = f0 * normal0 + f1 * normal1 + f2 * normal2;

        let up: vec3<f32> = vec3<f32>(0.0, 1.0, 0.0);
        let rotation: mat3x3<f32> = rotation_matrix_from_to(up, normal);

        let alignedInstanceMatrix: mat4x4<f32> = mat4x4<f32>(
            rotation[0][0], rotation[1][0], rotation[2][0], position.x,
            rotation[0][1], rotation[1][1], rotation[2][1], position.y,
            rotation[0][2], rotation[1][2], rotation[2][2], position.z,
            0.0, 0.0, 0.0, 1.0
        );

        let instanceMatrix: mat4x4<f32> = mat4x4<f32>(
            1.0, 0.0, 0.0, position.x,
            0.0, 1.0, 0.0, position.y,
            0.0, 0.0, 1.0, position.z,
            0.0, 0.0, 0.0, 1.0
        );

        // get instance counter value and then increment it by one (atomic)
        let offset = atomicAdd(&instanceCounter, 1) * 16;

        // write instance matrix to buffer
        instanceMatrices.elements[offset + 0] = instanceMatrix[0][0];
        instanceMatrices.elements[offset + 1] = instanceMatrix[1][0];
        instanceMatrices.elements[offset + 2] = instanceMatrix[2][0];
        instanceMatrices.elements[offset + 3] = instanceMatrix[3][0];

        instanceMatrices.elements[offset + 4] = instanceMatrix[0][1];
        instanceMatrices.elements[offset + 5] = instanceMatrix[1][1];
        instanceMatrices.elements[offset + 6] = instanceMatrix[2][1];
        instanceMatrices.elements[offset + 7] = instanceMatrix[3][1];

        instanceMatrices.elements[offset + 8] = instanceMatrix[0][2];
        instanceMatrices.elements[offset + 9] = instanceMatrix[1][2];
        instanceMatrices.elements[offset + 10] = instanceMatrix[2][2];
        instanceMatrices.elements[offset + 11] = instanceMatrix[3][2];

        instanceMatrices.elements[offset + 12] = instanceMatrix[0][3];
        instanceMatrices.elements[offset + 13] = instanceMatrix[1][3];
        instanceMatrices.elements[offset + 14] = instanceMatrix[2][3];
        instanceMatrices.elements[offset + 15] = instanceMatrix[3][3];

        // write aligned instance matrix to buffer
        alignedInstanceMatrices.elements[offset + 0] = alignedInstanceMatrix[0][0];
        alignedInstanceMatrices.elements[offset + 1] = alignedInstanceMatrix[1][0];
        alignedInstanceMatrices.elements[offset + 2] = alignedInstanceMatrix[2][0];
        alignedInstanceMatrices.elements[offset + 3] = alignedInstanceMatrix[3][0];

        alignedInstanceMatrices.elements[offset + 4] = alignedInstanceMatrix[0][1];
        alignedInstanceMatrices.elements[offset + 5] = alignedInstanceMatrix[1][1];
        alignedInstanceMatrices.elements[offset + 6] = alignedInstanceMatrix[2][1];
        alignedInstanceMatrices.elements[offset + 7] = alignedInstanceMatrix[3][1];

        alignedInstanceMatrices.elements[offset + 8] = alignedInstanceMatrix[0][2];
        alignedInstanceMatrices.elements[offset + 9] = alignedInstanceMatrix[1][2];
        alignedInstanceMatrices.elements[offset + 10] = alignedInstanceMatrix[2][2];
        alignedInstanceMatrices.elements[offset + 11] = alignedInstanceMatrix[3][2];

        alignedInstanceMatrices.elements[offset + 12] = alignedInstanceMatrix[0][3];
        alignedInstanceMatrices.elements[offset + 13] = alignedInstanceMatrix[1][3];
        alignedInstanceMatrices.elements[offset + 14] = alignedInstanceMatrix[2][3];
        alignedInstanceMatrices.elements[offset + 15] = alignedInstanceMatrix[3][3];
    }
}