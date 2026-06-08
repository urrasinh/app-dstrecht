/**
 * Pixel-level replication of CSS filter functions.
 *
 * The on-screen preview applies visual filters via CSS on the <canvas> DOM
 * element (style.filter), which works on every browser. But `ctx.filter`
 * (the 2D-context property) is unsupported on iOS Safari < 17.4, so baking
 * and exporting — which rasterize via ctx.filter — silently produced an
 * UNFILTERED image on iPhones ("los filtros visuales no se fijan").
 *
 * This module reimplements the exact CSS filter math (W3C Filter Effects
 * Module Level 1) so that preview == baked == exported on ALL browsers.
 *
 * Supported functions: invert, brightness, contrast, saturate, grayscale,
 * sepia, hue-rotate — i.e. every function emitted by VISUAL_FILTERS.build().
 */

type RGB = [number, number, number];
type PixelOp = (r: number, g: number, b: number) => RGB;

function clamp255(v: number): number {
    return v < 0 ? 0 : v > 255 ? 255 : v;
}

/** Apply a row-major 3x3 color matrix to a pixel. */
function applyMatrix(r: number, g: number, b: number, m: number[]): RGB {
    return [
        m[0] * r + m[1] * g + m[2] * b,
        m[3] * r + m[4] * g + m[5] * b,
        m[6] * r + m[7] * g + m[8] * b,
    ];
}

/** Build a per-pixel operation for a single CSS filter function. */
function makeOp(name: string, value: number): PixelOp | null {
    switch (name) {
        case 'invert': {
            const a = value; // 0..1
            const k = 1 - 2 * a;
            const add = a * 255;
            return (r, g, b) => [k * r + add, k * g + add, k * b + add];
        }
        case 'brightness': {
            const a = value; // 1 = unchanged
            return (r, g, b) => [r * a, g * a, b * a];
        }
        case 'contrast': {
            const a = value; // 1 = unchanged
            const intercept = 128 * (1 - a);
            return (r, g, b) => [r * a + intercept, g * a + intercept, b * a + intercept];
        }
        case 'saturate': {
            const s = value; // 1 = unchanged
            const m = [
                0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
                0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
                0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
            ];
            return (r, g, b) => applyMatrix(r, g, b, m);
        }
        case 'grayscale': {
            const a = value > 1 ? 1 : value; // amount 0..1
            const s = 1 - a;
            const m = [
                0.2126 + 0.7874 * s, 0.7152 - 0.7152 * s, 0.0722 - 0.0722 * s,
                0.2126 - 0.2126 * s, 0.7152 + 0.2848 * s, 0.0722 - 0.0722 * s,
                0.2126 - 0.2126 * s, 0.7152 - 0.7152 * s, 0.0722 + 0.9278 * s,
            ];
            return (r, g, b) => applyMatrix(r, g, b, m);
        }
        case 'sepia': {
            const a = value > 1 ? 1 : value; // amount 0..1
            const s = 1 - a;
            const m = [
                0.393 + 0.607 * s, 0.769 - 0.769 * s, 0.189 - 0.189 * s,
                0.349 - 0.349 * s, 0.686 + 0.314 * s, 0.168 - 0.168 * s,
                0.272 - 0.272 * s, 0.534 - 0.534 * s, 0.131 + 0.869 * s,
            ];
            return (r, g, b) => applyMatrix(r, g, b, m);
        }
        case 'hue-rotate': {
            const angle = (value * Math.PI) / 180; // value already in degrees
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const m = [
                0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928,
                0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.140, 0.072 - cos * 0.072 - sin * 0.283,
                0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072,
            ];
            return (r, g, b) => applyMatrix(r, g, b, m);
        }
        default:
            return null;
    }
}

/** Parse a CSS filter string like "sepia(50%) hue-rotate(180deg) saturate(200%)". */
function parseFilterString(filter: string): PixelOp[] {
    const ops: PixelOp[] = [];
    const re = /([a-z-]+)\(\s*([^)]+?)\s*\)/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(filter)) !== null) {
        const name = match[1].toLowerCase();
        const raw = match[2].trim();
        let value: number;
        if (raw.endsWith('%')) value = parseFloat(raw) / 100;
        else value = parseFloat(raw); // deg or unitless
        if (Number.isNaN(value)) continue;
        const op = makeOp(name, value);
        if (op) ops.push(op);
    }
    return ops;
}

/**
 * Returns a NEW ImageData with the CSS filter chain baked into the pixels.
 * If the filter is empty / 'none', returns the source unchanged (same ref).
 * Filters are applied left-to-right (CSS order). Intermediate values are kept
 * unclamped through the chain and clamped once at the end, matching how GPUs
 * evaluate the CSS filter pipeline.
 */
export function applyCssFilterString(src: ImageData, filter: string): ImageData {
    if (!filter || filter === 'none' || !filter.trim()) return src;
    const ops = parseFilterString(filter);
    if (ops.length === 0) return src;

    const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
    const d = out.data;
    const n = ops.length;
    for (let i = 0; i < d.length; i += 4) {
        let r = d[i], g = d[i + 1], b = d[i + 2];
        for (let k = 0; k < n; k++) {
            const res = ops[k](r, g, b);
            r = res[0]; g = res[1]; b = res[2];
        }
        d[i] = clamp255(r);
        d[i + 1] = clamp255(g);
        d[i + 2] = clamp255(b);
        // alpha (d[i+3]) untouched
    }
    return out;
}
