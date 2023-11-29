struct Params {
    nbVerticesPerRow: u32,
    size: f32,
    position: vec3<f32>,
};

@group(0) @binding(0) var<storage, read_write> positions: array<f32>;
@group(0) @binding(1) var<storage, read_write> normals: array<f32>;
@group(0) @binding(2) var<storage, read_write> indices: array<u32>;
@group(0) @binding(3) var<uniform> params: Params;

@compute @workgroup_size(1,1,1)
fn main(@builtin(global_invocation_id) id: vec3<u32>)
{
    let x: f32 = f32(id.x);
    let y: f32 = f32(id.y);

    let index: u32 = id.x + id.y * u32(params.nbVerticesPerRow);

    let vertex_position = vec3<f32>(params.size * x / f32(params.nbVerticesPerRow - 1) - params.size / 2.0, 0.0, params.size * y / f32(params.nbVerticesPerRow - 1) - params.size / 2.0);
    let vertex_position_world = vertex_position + params.position;

    let heightMultiplier = 3.0;
    let frequency = 0.1;
    let height = cos(vertex_position_world.x * frequency) * sin(vertex_position_world.z * frequency) * heightMultiplier;
    let gradX = -sin(vertex_position_world.x * frequency) * sin(vertex_position_world.z * frequency) * frequency * heightMultiplier;
    let gradZ = cos(vertex_position_world.x * frequency) * cos(vertex_position_world.z * frequency) * frequency * heightMultiplier;

    positions[index * 3 + 0] = vertex_position.x;
    positions[index * 3 + 1] = height;
    positions[index * 3 + 2] = vertex_position.z;

    let normal = normalize(vec3<f32>(-gradX, 1.0, -gradZ));
    normals[index * 3 + 0] = normal.x;
    normals[index * 3 + 1] = normal.y;
    normals[index * 3 + 2] = normal.z;

    if(x > 0 && y > 0) {
        let indexIndex = ((id.x - 1) + (id.y - 1) * (params.nbVerticesPerRow - 1)) * 6;

        indices[indexIndex + 0] = index - 1;
        indices[indexIndex + 1] = index - params.nbVerticesPerRow - 1;
        indices[indexIndex + 2] = index;

        indices[indexIndex + 3] = index;
        indices[indexIndex + 4] = index - params.nbVerticesPerRow - 1;
        indices[indexIndex + 5] = index - params.nbVerticesPerRow;
    }
}