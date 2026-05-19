/**
 * Generate PWA icons from public/paqarina-vertical.png.
 * Composites the logo on a square tierra-900 background with ~20% padding.
 *
 * Run: node scripts/generate-pwa-icons.mjs
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'public', 'paqarina-vertical.png');

const BG = { r: 0x14, g: 0x10, b: 0x0c, alpha: 1 }; // tierra-900

const targets = [
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'pwa-512x512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size } of targets) {
    const inner = Math.round(size * 0.7);
    const logo = await sharp(SRC)
        .resize(inner, inner, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .toBuffer();

    await sharp({
        create: { width: size, height: size, channels: 4, background: BG },
    })
        .composite([{ input: logo, gravity: 'center' }])
        .png({ compressionLevel: 9 })
        .toFile(path.join(ROOT, 'public', name));

    console.log(`✓ public/${name} (${size}×${size})`);
}
