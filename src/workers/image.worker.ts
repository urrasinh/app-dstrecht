import { Matrix, EigenvalueDecomposition } from 'ml-matrix';
import type { WorkerRequest, WorkerResponse, DStretchParams } from '../types';
import { MODES, rgbToLab } from '../utils/dstretch';

// Constants
const MAX_PX = 2048;
const DEFAULT_GAIN = 15;       // Multiplicative contrast boost (DStretch traditional value)
const DEFAULT_CLIP = 0.005;    // 0.5% percentile clipping each side before normalization
const EPS = 1e-7;

/**
 * Decorrelation Stretch (DStretch) — based on Alley/Harman/lbrabec reference.
 *
 * Pipeline:
 *   1. RGB → working space (matrix pre-multiply or LAB conversion)
 *   2. Compute mean and 3x3 covariance
 *   3. Eigendecomposition of covariance  ⇒ V (eigenvectors), λ (eigenvalues)
 *   4. Build SCALED ZCA transform:
 *        T = diag(σ_input) · V · diag(1/√|λ|) · Vᵀ
 *      where σ_input = sqrt(diag(cov)) preserves per-channel variance.
 *   5. Apply T to centered pixels with scalar gain: y = (x - mean) · Tᵀ · gain + mean
 *   6. Percentile-clip (top/bottom 0.5%) + min/max normalize to [0, 255]
 */
function applyDStretch(imageData: ImageData, spaceName: string, params?: DStretchParams): ImageData {
    const SCALE_GAIN = params?.gain ?? DEFAULT_GAIN;
    const CLIP_PCT = Math.min(0.49, Math.max(0, params?.clip ?? DEFAULT_CLIP));
    const modeConfig = MODES[spaceName];
    if (modeConfig.type === 'NONE') {
        return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
    }

    const data = imageData.data;
    const len = data.length / 4;

    // ── 1. Pre-transform RGB → working space ───────────────────────────────
    let pixels: Float32Array | null = new Float32Array(len * 3);

    if (modeConfig.type && modeConfig.type.startsWith('LAB')) {
        for (let i = 0; i < len; i++) {
            const lab = rgbToLab(data[i * 4] / 255, data[i * 4 + 1] / 255, data[i * 4 + 2] / 255);
            if (modeConfig.type === 'LAB_MOD1') { lab[1] *= 1.2; lab[2] *= 0.8; }
            else if (modeConfig.type === 'LAB_MOD2') { lab[1] *= 1.5; lab[2] *= 0.5; }
            else if (modeConfig.type === 'LAB_MOD3') { lab[1] *= 2.0; lab[2] *= 2.0; }
            else if (modeConfig.type === 'LAB_MOD4') { lab[1] *= 0.5; lab[2] *= 1.5; }
            pixels[i * 3] = lab[0];
            pixels[i * 3 + 1] = lab[1];
            pixels[i * 3 + 2] = lab[2];
        }
    } else {
        const m = modeConfig.mat!;
        const m00 = m[0][0], m01 = m[0][1], m02 = m[0][2];
        const m10 = m[1][0], m11 = m[1][1], m12 = m[1][2];
        const m20 = m[2][0], m21 = m[2][1], m22 = m[2][2];
        for (let i = 0; i < len; i++) {
            const r = data[i * 4] / 255, g = data[i * 4 + 1] / 255, b = data[i * 4 + 2] / 255;
            pixels[i * 3] = r * m00 + g * m01 + b * m02;
            pixels[i * 3 + 1] = r * m10 + g * m11 + b * m12;
            pixels[i * 3 + 2] = r * m20 + g * m21 + b * m22;
        }
    }

    // ── 2. Mean per channel ────────────────────────────────────────────────
    let mean0 = 0, mean1 = 0, mean2 = 0;
    for (let i = 0; i < len; i++) {
        mean0 += pixels[i * 3];
        mean1 += pixels[i * 3 + 1];
        mean2 += pixels[i * 3 + 2];
    }
    mean0 /= len; mean1 /= len; mean2 /= len;

    // ── 3. 3x3 covariance ──────────────────────────────────────────────────
    let c00 = 0, c01 = 0, c02 = 0, c11 = 0, c12 = 0, c22 = 0;
    for (let i = 0; i < len; i++) {
        const d0 = pixels[i * 3] - mean0;
        const d1 = pixels[i * 3 + 1] - mean1;
        const d2 = pixels[i * 3 + 2] - mean2;
        c00 += d0 * d0; c01 += d0 * d1; c02 += d0 * d2;
        c11 += d1 * d1; c12 += d1 * d2;
        c22 += d2 * d2;
    }
    c00 /= len; c01 /= len; c02 /= len; c11 /= len; c12 /= len; c22 /= len;

    // Per-channel std devs (preserved through decorrelation)
    const sd0 = Math.sqrt(Math.abs(c00) + EPS);
    const sd1 = Math.sqrt(Math.abs(c11) + EPS);
    const sd2 = Math.sqrt(Math.abs(c22) + EPS);

    // ── 4. Eigendecomposition + scaled ZCA transform ───────────────────────
    let t00 = 1, t01 = 0, t02 = 0;
    let t10 = 0, t11 = 1, t12 = 0;
    let t20 = 0, t21 = 0, t22 = 1;

    try {
        const cov = new Matrix([
            [c00, c01, c02],
            [c01, c11, c12],
            [c02, c12, c22],
        ]);
        const evd = new EigenvalueDecomposition(cov, { assumeSymmetric: true });
        const V = evd.eigenvectorMatrix;
        const lambda = evd.realEigenvalues;

        const invSqrtL = Matrix.diag(lambda.map(l => 1 / Math.sqrt(Math.abs(l) + EPS)));
        const sigmaDiag = Matrix.diag([sd0, sd1, sd2]);

        // T = diag(σ) · V · diag(1/√λ) · Vᵀ  — scaled ZCA whitening
        const transform = sigmaDiag.mmul(V).mmul(invSqrtL).mmul(V.transpose());

        t00 = transform.get(0, 0); t01 = transform.get(0, 1); t02 = transform.get(0, 2);
        t10 = transform.get(1, 0); t11 = transform.get(1, 1); t12 = transform.get(1, 2);
        t20 = transform.get(2, 0); t21 = transform.get(2, 1); t22 = transform.get(2, 2);
    } catch (err) {
        console.warn(`EVD failed for mode ${spaceName}, falling back to identity`, err);
    }

    // ── 5. Apply transform with mean preservation + scalar gain ────────────
    let result: Float32Array | null = new Float32Array(len * 3);

    for (let i = 0; i < len; i++) {
        const d0 = pixels[i * 3] - mean0;
        const d1 = pixels[i * 3 + 1] - mean1;
        const d2 = pixels[i * 3 + 2] - mean2;

        // y = (x - mean) · Tᵀ · gain + mean   (mean preserved)
        result[i * 3] = (t00 * d0 + t01 * d1 + t02 * d2) * SCALE_GAIN + mean0;
        result[i * 3 + 1] = (t10 * d0 + t11 * d1 + t12 * d2) * SCALE_GAIN + mean1;
        result[i * 3 + 2] = (t20 * d0 + t21 * d1 + t22 * d2) * SCALE_GAIN + mean2;
    }

    pixels = null;

    // ── 6. Percentile clipping per channel ─────────────────────────────────
    // Estimate percentiles using a sampled histogram (faster than full sort).
    const lo = [0, 0, 0];
    const hi = [0, 0, 0];
    for (let ch = 0; ch < 3; ch++) {
        const sample = sampleChannel(result, ch, len, 50000);
        sample.sort((a, b) => a - b);
        const loIdx = Math.floor(sample.length * CLIP_PCT);
        const hiIdx = Math.floor(sample.length * (1 - CLIP_PCT)) - 1;
        lo[ch] = sample[Math.max(0, loIdx)];
        hi[ch] = sample[Math.min(sample.length - 1, hiIdx)];
    }

    // ── 7. Normalize to [0, 255] with percentile clipping ──────────────────
    const range0 = (hi[0] - lo[0]) + EPS;
    const range1 = (hi[1] - lo[1]) + EPS;
    const range2 = (hi[2] - lo[2]) + EPS;

    let output: Uint8ClampedArray | null = new Uint8ClampedArray(data.length);
    for (let i = 0; i < len; i++) {
        const r = ((result[i * 3] - lo[0]) / range0) * 255;
        const g = ((result[i * 3 + 1] - lo[1]) / range1) * 255;
        const b = ((result[i * 3 + 2] - lo[2]) / range2) * 255;
        output[i * 4] = r < 0 ? 0 : r > 255 ? 255 : r;
        output[i * 4 + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
        output[i * 4 + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
        output[i * 4 + 3] = 255;
    }

    result = null;

    // @ts-ignore — typed array transferred to ImageData
    const finalImage = new ImageData(output, imageData.width, imageData.height);
    output = null;
    return finalImage;
}

/** Reservoir sample of one channel from the result Float32Array. */
function sampleChannel(arr: Float32Array, ch: number, len: number, sampleSize: number): number[] {
    const target = Math.min(sampleSize, len);
    const out: number[] = new Array(target);
    if (len <= target) {
        for (let i = 0; i < len; i++) out[i] = arr[i * 3 + ch];
        return out;
    }
    const step = len / target;
    for (let i = 0; i < target; i++) {
        const idx = Math.floor(i * step);
        out[i] = arr[idx * 3 + ch];
    }
    return out;
}

// ── Worker entry point ─────────────────────────────────────────────────────

const ctx: Worker = self as any;

ctx.onmessage = async (e: MessageEvent<WorkerRequest>) => {
    const req = e.data;

    try {
        if (req.type === 'INIT_PROCESS') {
            const { imageData, scaleDown, params } = req;

            let w = imageData.width;
            let h = imageData.height;
            const targetImageData = imageData;

            if (scaleDown && (w > MAX_PX || h > MAX_PX)) {
                const ratio = Math.min(MAX_PX / w, MAX_PX / h);
                w = Math.floor(w * ratio);
                h = Math.floor(h * ratio);
            }

            const modeKeys = Object.keys(MODES);
            const processedImages: { modeName: string; imageData: ImageData }[] = [];

            for (let i = 0; i < modeKeys.length; i++) {
                const mode = modeKeys[i];
                const pct = Math.round((i / modeKeys.length) * 100);

                ctx.postMessage({
                    type: 'PROGRESS',
                    progress: pct,
                    message: `GENERANDO MATRIZ ${mode}...`,
                } as WorkerResponse);

                const newImageData = applyDStretch(targetImageData, mode, params);
                processedImages.push({ modeName: mode, imageData: newImageData });
            }

            ctx.postMessage({
                type: 'SUCCESS',
                processedImages,
                baseImageData: targetImageData,
                width: w,
                height: h,
            } as WorkerResponse);

        } else if (req.type === 'PROCESS_SINGLE') {
            // Re-process a single mode with new params (used when user adjusts gain/clip)
            const { imageData, mode, params } = req;
            const newImageData = applyDStretch(imageData, mode, params);
            ctx.postMessage({
                type: 'SUCCESS',
                processedImages: [{ modeName: mode, imageData: newImageData }],
                baseImageData: imageData,
                width: imageData.width,
                height: imageData.height,
            } as WorkerResponse);

        } else if (req.type === 'CROP' || req.type === 'ROTATE_90') {
            // No-op: main thread re-issues INIT_PROCESS with new ImageData
        }
    } catch (error: any) {
        ctx.postMessage({
            type: 'ERROR',
            error: error.message || 'Error processing image',
        } as WorkerResponse);
    }
};
