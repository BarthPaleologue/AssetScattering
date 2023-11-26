export function triangleArea(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, x3: number, y3: number, z3: number) {
    // use cross product to calculate area of triangle
    const ux = x2 - x1;
    const uy = y2 - y1;
    const uz = z2 - z1;

    const vx = x3 - x1;
    const vy = y3 - y1;
    const vz = z3 - z1;

    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;

    return Math.sqrt(nx * nx + ny * ny + nz * nz) / 2;
}

export function triangleAreaFromBuffer(positions: Float32Array, index1: number, index2: number, index3: number) {
    return triangleArea(
        positions[3 * index1 + 0],
        positions[3 * index1 + 1],
        positions[3 * index1 + 2],
        positions[3 * index2 + 0],
        positions[3 * index2 + 1],
        positions[3 * index2 + 2],
        positions[3 * index3 + 0],
        positions[3 * index3 + 1],
        positions[3 * index3 + 2]
    );
}

export function randomPointInTriangleFromBuffer(positions: Float32Array, normals: Float32Array, index1: number, index2: number, index3: number) {
    const r1 = Math.random();
    const r2 = Math.random();

    const x1 = positions[3 * index1 + 0];
    const y1 = positions[3 * index1 + 1];
    const z1 = positions[3 * index1 + 2];

    const x2 = positions[3 * index2 + 0];
    const y2 = positions[3 * index2 + 1];
    const z2 = positions[3 * index2 + 2];

    const x3 = positions[3 * index3 + 0];
    const y3 = positions[3 * index3 + 1];
    const z3 = positions[3 * index3 + 2];

    const n1x = normals[3 * index1 + 0];
    const n1y = normals[3 * index1 + 1];
    const n1z = normals[3 * index1 + 2];

    const n2x = normals[3 * index2 + 0];
    const n2y = normals[3 * index2 + 1];
    const n2z = normals[3 * index2 + 2];

    const n3x = normals[3 * index3 + 0];
    const n3y = normals[3 * index3 + 1];
    const n3z = normals[3 * index3 + 2];

    const f1 = 1 - Math.sqrt(r1);
    const f2 = Math.sqrt(r1) * (1 - r2);
    const f3 = Math.sqrt(r1) * r2;

    const x = f1 * x1 + f2 * x2 + f3 * x3;
    const y = f1 * y1 + f2 * y2 + f3 * y3;
    const z = f1 * z1 + f2 * z2 + f3 * z3;

    const nx = f1 * n1x + f2 * n2x + f3 * n3x;
    const ny = f1 * n1y + f2 * n2y + f3 * n3y;
    const nz = f1 * n1z + f2 * n2z + f3 * n3z;

    return [x, y, z, nx, ny, nz];
}
