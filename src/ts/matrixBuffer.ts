export function downSample(matrixBuffer: Float32Array, stride: number): Float32Array {
    const downSampledBuffer = new Float32Array(16 * Math.floor(matrixBuffer.length / stride));
    for (let i = 0; i < matrixBuffer.length; i += 16 * stride) {
        downSampledBuffer.set(matrixBuffer.subarray(i, i + 16), i / stride);
    }
    return downSampledBuffer;
}