import { eigs, multiply, diag, transpose } from 'mathjs';
import type { WorkerRequest, WorkerResponse } from '../types';
import { MODES, rgbToLab } from '../utils/dstretch';

// Constants
const MAX_PX = 2048;
const SIGMA = 1.5;

function applyDStretch(imageData: ImageData, spaceName: string, sigma: number): ImageData {
    const modeConfig = MODES[spaceName];
    if (modeConfig.type === 'NONE') {
        return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
    }

    const data = imageData.data;
    const len = data.length / 4;

    // Allocate memory
    let pixels: Float32Array | null = new Float32Array(len * 3);

    if (modeConfig.type && modeConfig.type.startsWith('LAB')) {
        for (let i = 0; i < len; i++) {
            const lab = rgbToLab(data[i * 4] / 255, data[i * 4 + 1] / 255, data[i * 4 + 2] / 255);
            if (modeConfig.type === 'LAB_MOD1') { lab[1] *= 1.2; lab[2] *= 0.8; }
            if (modeConfig.type === 'LAB_MOD2') { lab[1] *= 1.5; lab[2] *= 0.5; }
            pixels[i * 3] = lab[0]; pixels[i * 3 + 1] = lab[1]; pixels[i * 3 + 2] = lab[2];
        }
    } else {
        const matrix = modeConfig.mat!;
        for (let i = 0; i < len; i++) {
            const r = data[i * 4] / 255, g = data[i * 4 + 1] / 255, b = data[i * 4 + 2] / 255;
            pixels[i * 3] = r * matrix[0][0] + g * matrix[0][1] + b * matrix[0][2];
            pixels[i * 3 + 1] = r * matrix[1][0] + g * matrix[1][1] + b * matrix[1][2];
            pixels[i * 3 + 2] = r * matrix[2][0] + g * matrix[2][1] + b * matrix[2][2];
        }
    }

    let means = [0, 0, 0];
    for (let i = 0; i < len; i++) {
        means[0] += pixels[i * 3];
        means[1] += pixels[i * 3 + 1];
        means[2] += pixels[i * 3 + 2];
    }
    means = means.map(m => m / len);

    let cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < len; i++) {
        const d0 = pixels[i * 3] - means[0], d1 = pixels[i * 3 + 1] - means[1], d2 = pixels[i * 3 + 2] - means[2];
        cov[0][0] += d0 * d0; cov[0][1] += d0 * d1; cov[0][2] += d0 * d2;
        cov[1][1] += d1 * d1; cov[1][2] += d1 * d2; cov[2][2] += d2 * d2;
    }
    for (let i = 0; i < 3; i++) for (let j = i; j < 3; j++) { cov[i][j] /= len; cov[j][i] = cov[i][j]; }

    // @ts-ignore math.js types
    const resultObj = eigs(cov);
    const values = resultObj.values as number[];
    const vectors = (resultObj.eigenvectors ? resultObj.eigenvectors.map((e: any) => e.vector) : (resultObj as any).vectors) as number[][];

    const invSqrtL = values.map(v => 1.0 / Math.sqrt(Math.abs(v) + 1e-7));
    const transform = multiply(multiply(vectors, diag(invSqrtL)), transpose(vectors));

    let result: Float32Array | null = new Float32Array(len * 3);
    let mins = [Infinity, Infinity, Infinity], maxs = [-Infinity, -Infinity, -Infinity];

    // @ts-ignore mathjs types
    const rawTransform = Array.isArray(transform) ? transform : transform.valueOf();

    // Convert transform matrix to vanilla JS array of arrays for speed
    const t = [
        [rawTransform[0][0], rawTransform[0][1], rawTransform[0][2]],
        [rawTransform[1][0], rawTransform[1][1], rawTransform[1][2]],
        [rawTransform[2][0], rawTransform[2][1], rawTransform[2][2]]
    ];

    for (let i = 0; i < len; i++) {
        const d0 = pixels[i * 3] - means[0];
        const d1 = pixels[i * 3 + 1] - means[1];
        const d2 = pixels[i * 3 + 2] - means[2];

        // Manual matrix multiplication (Fastest unrolled approach)
        const s0 = t[0][0] * d0 + t[0][1] * d1 + t[0][2] * d2;
        const s1 = t[1][0] * d0 + t[1][1] * d1 + t[1][2] * d2;
        const s2 = t[2][0] * d0 + t[2][1] * d1 + t[2][2] * d2;

        const val0 = s0 * sigma;
        const val1 = s1 * sigma;
        const val2 = s2 * sigma;

        result[i * 3] = val0;
        result[i * 3 + 1] = val1;
        result[i * 3 + 2] = val2;

        if (val0 < mins[0]) mins[0] = val0; if (val0 > maxs[0]) maxs[0] = val0;
        if (val1 < mins[1]) mins[1] = val1; if (val1 > maxs[1]) maxs[1] = val1;
        if (val2 < mins[2]) mins[2] = val2; if (val2 > maxs[2]) maxs[2] = val2;
    }

    // Free pixels array
    pixels = null;

    let output: Uint8ClampedArray | null = new Uint8ClampedArray(data.length);
    for (let i = 0; i < len; i++) {
        for (let j = 0; j < 3; j++) {
            output[i * 4 + j] = ((result[i * 3 + j] - mins[j]) / (maxs[j] - mins[j] + 1e-7)) * 255;
        }
        output[i * 4 + 3] = 255;
    }

    // Free result array
    result = null;

    // @ts-ignore
    const finalImage = new ImageData(output, imageData.width, imageData.height);
    output = null; // Free typed array
    return finalImage;
}

// Global scope for web worker
const ctx: Worker = self as any;

ctx.onmessage = async (e: MessageEvent<WorkerRequest>) => {
    const req = e.data;

    try {
        if (req.type === 'INIT_PROCESS') {
            const { imageData, scaleDown } = req;

            let w = imageData.width;
            let h = imageData.height;
            let targetImageData = imageData;

            // Scale down using OffscreenCanvas if needed
            if (scaleDown && (w > MAX_PX || h > MAX_PX)) {
                const ratio = Math.min(MAX_PX / w, MAX_PX / h);
                w = Math.floor(w * ratio);
                h = Math.floor(h * ratio);

                // We'll trust the main thread scaled it or we just process this size.
                // Actually, let's let the main thread do the createImageBitmap and scaling to prevent
                // complex async logic here if ImageData is already passed.
                // The main thread should send the scaled ImageData.
                // If not, we process what we get.
            }

            const modeKeys = Object.keys(MODES);
            const processedImages: { modeName: string, imageData: ImageData }[] = [];

            for (let i = 0; i < modeKeys.length; i++) {
                const mode = modeKeys[i];
                const pct = Math.round(((i) / modeKeys.length) * 100);

                ctx.postMessage({
                    type: 'PROGRESS',
                    progress: pct,
                    message: `GENERANDO MATRIZ ${mode}...`
                } as WorkerResponse);

                const newImageData = applyDStretch(targetImageData, mode, SIGMA);
                processedImages.push({ modeName: mode, imageData: newImageData });
            }

            ctx.postMessage({
                type: 'SUCCESS',
                processedImages,
                baseImageData: targetImageData,
                width: w,
                height: h
            } as WorkerResponse);

        } else if (req.type === 'CROP' || req.type === 'ROTATE_90') {
            // For crop and rotate, we assume the main thread sends the NEW base ImageData
            // and we just re-run all matrices on it.
            // So this will be handled mostly like INIT_PROCESS by the main thread.
            // In this version, we will only use INIT_PROCESS for everything to keep it simple,
            // and main thread provides the cropped/rotated ImageData.
        }

    } catch (error: any) {
        ctx.postMessage({
            type: 'ERROR',
            error: error.message || 'Error processing image'
        } as WorkerResponse);
    }
};
