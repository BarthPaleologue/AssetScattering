import {Matrix, Quaternion, Vector3} from "@babylonjs/core/Maths/math.vector";

export function downSample(matrixBuffer: Float32Array, stride: number): Float32Array {
    const downSampledBuffer = new Float32Array(16 * Math.floor(matrixBuffer.length / stride));
    for (let i = 0; i < matrixBuffer.length; i += 16 * stride) {
        downSampledBuffer.set(matrixBuffer.subarray(i, i + 16), i / stride);
    }
    return downSampledBuffer;
}

export function createSquareMatrixBuffer(position: Vector3, size: number, resolution: number) {
    const matrixBuffer = new Float32Array(resolution * resolution * 16);
    const cellSize = size / resolution;
    let index = 0;
    for (let x = 0; x < resolution; x++) {
        for (let z = 0; z < resolution; z++) {
            const randomCellPositionX = Math.random() * cellSize;
            const randomCellPositionZ = Math.random() * cellSize;
            const positionX = position.x + x * cellSize - (size / 2) + randomCellPositionX;
            const positionZ = position.z + z * cellSize - (size / 2) + randomCellPositionZ;
            const scaling = 0.7 + Math.random() * 0.6;

            const matrix = Matrix.Compose(
                new Vector3(scaling, scaling, scaling),
                Quaternion.RotationAxis(Vector3.Up(), Math.random() * 2 * Math.PI),
                new Vector3(positionX, 0, positionZ)
            );
            matrix.copyToArray(matrixBuffer, 16 * index);

            index += 1;
        }
    }

    return matrixBuffer;
}