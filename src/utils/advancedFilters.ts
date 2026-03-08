// Utility file for Advanced Rock Art Filtering Algorithms
import { rgbToLab, labToRgb } from './dstretch';

export function processAdvancedFilter(
    sourceImageData: ImageData,
    filterId: string,
    params: Record<string, number>,
    onProgress?: (pct: number) => void
): ImageData {
    const w = sourceImageData.width;
    const h = sourceImageData.height;
    const src = sourceImageData.data;
    const dst = new Uint8ClampedArray(src.length);
    const len = src.length / 4;

    // Helper functions
    const getIdx = (x: number, y: number) => (Math.min(Math.max(y, 0), h - 1) * w + Math.min(Math.max(x, 0), w - 1)) * 4;

    switch (filterId) {

        case 'HISTOGRAM_EQ': {
            const intensity = (params.intensity ?? 100) / 100;
            // Calculate histogram of luminance (approximated by V in HSV or just average)
            const hist = new Int32Array(256);
            const cdf = new Int32Array(256);
            const lums = new Uint8Array(len);

            for (let i = 0; i < len; i++) {
                const r = src[i * 4], g = src[i * 4 + 1], b = src[i * 4 + 2];
                const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                lums[i] = lum;
                hist[lum]++;
            }

            cdf[0] = hist[0];
            for (let i = 1; i < 256; i++) cdf[i] = cdf[i - 1] + hist[i];

            let cdfMin = 0;
            for (let i = 0; i < 256; i++) { if (cdf[i] > 0) { cdfMin = cdf[i]; break; } }
            const denom = len - cdfMin;

            for (let i = 0; i < len; i++) {
                const lum = lums[i];
                const newLum = Math.round(((cdf[lum] - cdfMin) / denom) * 255);
                const ratio = lum === 0 ? 0 : newLum / lum;

                dst[i * 4] = Math.min(255, src[i * 4] * ratio * intensity + src[i * 4] * (1 - intensity));
                dst[i * 4 + 1] = Math.min(255, src[i * 4 + 1] * ratio * intensity + src[i * 4 + 1] * (1 - intensity));
                dst[i * 4 + 2] = Math.min(255, src[i * 4 + 2] * ratio * intensity + src[i * 4 + 2] * (1 - intensity));
                dst[i * 4 + 3] = src[i * 4 + 3];
            }
            break;
        }

        case 'BRIGHTNESS_CONTRAST': {
            const b = params.brightness ?? 0;
            const c = params.contrast ?? 50;
            const factor = (259 * (c + 255)) / (255 * (259 - c));

            for (let i = 0; i < len; i++) {
                dst[i * 4] = factor * (src[i * 4] - 128) + 128 + b;
                dst[i * 4 + 1] = factor * (src[i * 4 + 1] - 128) + 128 + b;
                dst[i * 4 + 2] = factor * (src[i * 4 + 2] - 128) + 128 + b;
                dst[i * 4 + 3] = src[i * 4 + 3];
            }
            break;
        }

        case 'RGB_ISOLATION': {
            const chan = params.channel ?? 0; // 0=R, 1=G, 2=B
            const boost = params.boost ?? 1.5;
            for (let i = 0; i < len; i++) {
                const val = Math.min(255, src[i * 4 + chan] * boost);
                dst[i * 4] = val; dst[i * 4 + 1] = val; dst[i * 4 + 2] = val;
                dst[i * 4 + 3] = src[i * 4 + 3];
            }
            break;
        }

        case 'LAB_LUMINANCE': {
            const lBoost = params.l_contrast ?? 1.5;
            for (let i = 0; i < len; i++) {
                const lab = rgbToLab(src[i * 4] / 255, src[i * 4 + 1] / 255, src[i * 4 + 2] / 255);
                lab[0] = Math.max(0, Math.min(100, (lab[0] - 50) * lBoost + 50));
                const rgb = labToRgb(lab[0], lab[1], lab[2]);
                dst[i * 4] = rgb[0] * 255; dst[i * 4 + 1] = rgb[1] * 255; dst[i * 4 + 2] = rgb[2] * 255;
                dst[i * 4 + 3] = src[i * 4 + 3];
            }
            break;
        }

        case 'COLOR_INVERSION': {
            for (let i = 0; i < len; i++) {
                dst[i * 4] = 255 - src[i * 4];
                dst[i * 4 + 1] = 255 - src[i * 4 + 1];
                dst[i * 4 + 2] = 255 - src[i * 4 + 2];
                dst[i * 4 + 3] = src[i * 4 + 3];
            }
            break;
        }

        case 'HIGH_PASS': {
            const radius = Math.round(params.radius ?? 3);
            const strength = (params.strength ?? 10) / 10;
            const blur = new Float32Array(len * 3);

            if (onProgress) onProgress(10);

            // Fast Box Blur Approximation
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    let r = 0, g = 0, b = 0, count = 0;
                    for (let ky = -radius; ky <= radius; ky++) {
                        for (let kx = -radius; kx <= radius; kx++) {
                            const idx = getIdx(x + kx, y + ky);
                            r += src[idx]; g += src[idx + 1]; b += src[idx + 2];
                            count++;
                        }
                    }
                    const bIdx = (y * w + x) * 3;
                    blur[bIdx] = r / count; blur[bIdx + 1] = g / count; blur[bIdx + 2] = b / count;
                }
                if (y % 100 === 0 && onProgress) onProgress(10 + Math.round((y / h) * 40));
            }

            for (let i = 0; i < len; i++) {
                const r = src[i * 4], g = src[i * 4 + 1], b = src[i * 4 + 2];
                const br = blur[i * 3], bg = blur[i * 3 + 1], bb = blur[i * 3 + 2];
                // High pass = Original - Blur + 128
                dst[i * 4] = Math.min(255, Math.max(0, (r - br) * strength + 128));
                dst[i * 4 + 1] = Math.min(255, Math.max(0, (g - bg) * strength + 128));
                dst[i * 4 + 2] = Math.min(255, Math.max(0, (b - bb) * strength + 128));
                dst[i * 4 + 3] = src[i * 4 + 3];
            }
            break;
        }

        case 'UNSHARP_MASK': {
            const amount = (params.amount ?? 150) / 100;
            const radius = Math.round(params.radius ?? 2);

            // Simplified unsharp via basic blur subtraction
            const blur = new Float32Array(len * 3);
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    let r = 0, g = 0, b = 0, count = 0;
                    for (let ky = -radius; ky <= radius; ky++) {
                        for (let kx = -radius; kx <= radius; kx++) {
                            const idx = getIdx(x + kx, y + ky);
                            r += src[idx]; g += src[idx + 1]; b += src[idx + 2];
                            count++;
                        }
                    }
                    const bIdx = (y * w + x) * 3;
                    blur[bIdx] = r / count; blur[bIdx + 1] = g / count; blur[bIdx + 2] = b / count;
                }
                if (y % 100 === 0 && onProgress) onProgress(Math.round((y / h) * 50));
            }

            for (let i = 0; i < len; i++) {
                const r = src[i * 4], g = src[i * 4 + 1], b = src[i * 4 + 2];
                const br = blur[i * 3], bg = blur[i * 3 + 1], bb = blur[i * 3 + 2];
                // Unsharp = Original + (Original - Blur) * amount
                dst[i * 4] = Math.min(255, Math.max(0, r + (r - br) * amount));
                dst[i * 4 + 1] = Math.min(255, Math.max(0, g + (g - bg) * amount));
                dst[i * 4 + 2] = Math.min(255, Math.max(0, b + (b - bb) * amount));
                dst[i * 4 + 3] = src[i * 4 + 3];
            }
            break;
        }

        case 'EMBOSS': {
            const depth = params.depth ?? 3;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const idx = (y * w + x) * 4;
                    const idxd = getIdx(x - 1, y - 1);
                    const idxu = getIdx(x + 1, y + 1);

                    for (let c = 0; c < 3; c++) {
                        const val = src[idx + c] + (src[idxd + c] - src[idxu + c]) * depth + 128;
                        dst[idx + c] = Math.min(255, Math.max(0, val));
                    }
                    dst[idx + 3] = src[idx + 3];
                }
            }
            break;
        }

        case 'POSTERIZE': {
            const levels = params.levels ?? 4;
            const step = 255 / (levels - 1);
            for (let i = 0; i < len; i++) {
                dst[i * 4] = Math.round(Math.round(src[i * 4] / step) * step);
                dst[i * 4 + 1] = Math.round(Math.round(src[i * 4 + 1] / step) * step);
                dst[i * 4 + 2] = Math.round(Math.round(src[i * 4 + 2] / step) * step);
                dst[i * 4 + 3] = src[i * 4 + 3];
            }
            break;
        }

        default:
            // Fallback: return copy
            for (let i = 0; i < src.length; i++) dst[i] = src[i];
    }

    // @ts-ignore
    return new ImageData(dst, w, h);
}
