import type { DStretchModeConfig } from '../types';

export const MODES: Record<string, DStretchModeConfig> = {
    'ORIGINAL': { desc: 'Base', type: 'NONE' },
    'YDS': { desc: 'Amarillos', type: 'MATRIX', mat: [[0.299, 0.587, 0.114], [-0.147, -0.289, 0.436], [0.615, -0.515, -0.100]] },
    'YBR': { desc: 'Rojos', type: 'MATRIX', mat: [[0.299, 0.587, 0.114], [-0.168, -0.331, 0.500], [0.500, -0.418, -0.082]] },
    'YBK': { desc: 'Negros', type: 'MATRIX', mat: [[0.299, 0.587, 0.114], [-0.147, -0.289, 0.436], [-0.615, 0.515, 0.100]] },
    'LAB': { desc: 'General', type: 'LAB' },
    'LDS': { desc: 'Amar/LAB', type: 'LAB_MOD1' },
    'LRE': { desc: 'Rojo/LAB', type: 'LAB_MOD2' }
};

export const VISUAL_FILTERS = {
    'Normal': (_i: number) => '',
    'Negativo': (i: number) => `invert(${i}%)`,
    'Cian': (i: number) => `sepia(${i * 0.5}%) hue-rotate(180deg) saturate(${100 + i}%)`,
    'HDR': (i: number) => `contrast(${100 + (i * 0.4)}%) saturate(${100 + (i * 0.5)}%) brightness(${100 - (i * 0.1)}%)`,
    'Ultra': (i: number) => `saturate(${100 + (i * 3)}%) contrast(${100 + i}%)`,
    'Grises': (i: number) => `grayscale(${i}%)`,
    'Saturado': (i: number) => `saturate(${100 + (i * 2)}%)`
};

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
    let x = r * 0.4124 + g * 0.3576 + b * 0.1805;
    let y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    let z = r * 0.0193 + g * 0.1192 + b * 0.9505;
    x /= 0.95047; y /= 1.0; z /= 1.08883;
    x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116;
    y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116;
    z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116;
    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
}

export function labToRgb(l: number, a: number, b: number): [number, number, number] {
    let y = (l + 16) / 116;
    let x = a / 500 + y;
    let z = y - b / 200;

    const y3 = Math.pow(y, 3);
    const x3 = Math.pow(x, 3);
    const z3 = Math.pow(z, 3);

    y = y3 > 0.008856 ? y3 : (y - 16 / 116) / 7.787;
    x = x3 > 0.008856 ? x3 : (x - 16 / 116) / 7.787;
    z = z3 > 0.008856 ? z3 : (z - 16 / 116) / 7.787;

    x *= 0.95047; y *= 1.0; z *= 1.08883;

    let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
    let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
    let b_val = x * 0.0557 + y * -0.2040 + z * 1.0570;

    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
    b_val = b_val > 0.0031308 ? 1.055 * Math.pow(b_val, 1 / 2.4) - 0.055 : 12.92 * b_val;

    return [Math.max(0, Math.min(1, r)), Math.max(0, Math.min(1, g)), Math.max(0, Math.min(1, b_val))];
}
