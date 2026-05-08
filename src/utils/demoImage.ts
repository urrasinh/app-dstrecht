/**
 * Generates a synthetic pictograph-like image for the tutorial.
 * Stone-colored background with simulated red/yellow ochre figures,
 * designed to respond well to DStretch (correlated color channels).
 */
export function generateDemoImage(): HTMLImageElement {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 700;
    const ctx = canvas.getContext('2d')!;

    // ── Stone-color base (irregular gradient) ──
    const baseGrad = ctx.createLinearGradient(0, 0, 1000, 700);
    baseGrad.addColorStop(0, '#a89684');
    baseGrad.addColorStop(0.4, '#988372');
    baseGrad.addColorStop(0.7, '#a89684');
    baseGrad.addColorStop(1, '#90796a');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 1000, 700);

    // Radial dark patches (shadows / mineral deposits)
    for (let i = 0; i < 10; i++) {
        const cx = Math.random() * 1000;
        const cy = Math.random() * 700;
        const radius = 80 + Math.random() * 200;
        const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        rg.addColorStop(0, 'rgba(60, 50, 40, 0.25)');
        rg.addColorStop(1, 'rgba(60, 50, 40, 0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, 1000, 700);
    }

    // Light patches
    for (let i = 0; i < 8; i++) {
        const cx = Math.random() * 1000;
        const cy = Math.random() * 700;
        const radius = 60 + Math.random() * 150;
        const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        rg.addColorStop(0, 'rgba(210, 195, 175, 0.15)');
        rg.addColorStop(1, 'rgba(210, 195, 175, 0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, 1000, 700);
    }

    // Texture noise (rock grain)
    for (let i = 0; i < 8000; i++) {
        const x = Math.random() * 1000;
        const y = Math.random() * 700;
        const v = (Math.random() - 0.5) * 35;
        ctx.fillStyle = `rgba(${110 + v}, ${90 + v}, ${70 + v}, 0.25)`;
        ctx.fillRect(x, y, 2, 2);
    }

    // ── Red ochre anthropomorphs (faded — DStretch will reveal them) ──
    const drawAnthropomorph = (cx: number, cy: number, scale: number, alpha: number) => {
        ctx.fillStyle = `rgba(140, 60, 40, ${alpha})`;
        // Head
        ctx.beginPath();
        ctx.arc(cx, cy - 35 * scale, 14 * scale, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.fillRect(cx - 4 * scale, cy - 22 * scale, 8 * scale, 50 * scale);
        // Arms (raised)
        ctx.fillRect(cx - 30 * scale, cy - 18 * scale, 26 * scale, 5 * scale);
        ctx.fillRect(cx + 4 * scale, cy - 18 * scale, 26 * scale, 5 * scale);
        ctx.fillRect(cx - 32 * scale, cy - 35 * scale, 5 * scale, 22 * scale);
        ctx.fillRect(cx + 27 * scale, cy - 35 * scale, 5 * scale, 22 * scale);
        // Legs
        ctx.fillRect(cx - 8 * scale, cy + 28 * scale, 5 * scale, 30 * scale);
        ctx.fillRect(cx + 3 * scale, cy + 28 * scale, 5 * scale, 30 * scale);
    };

    drawAnthropomorph(220, 350, 1.4, 0.42);
    drawAnthropomorph(310, 360, 1.2, 0.38);
    drawAnthropomorph(390, 355, 1.3, 0.4);

    // ── Red animals (camélido faded) ──
    const drawCamelid = (cx: number, cy: number, scale: number, alpha: number) => {
        ctx.fillStyle = `rgba(135, 55, 38, ${alpha})`;
        ctx.beginPath();
        // Body (oval)
        ctx.ellipse(cx, cy, 40 * scale, 14 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        // Neck
        ctx.fillRect(cx + 32 * scale, cy - 30 * scale, 7 * scale, 25 * scale);
        // Head
        ctx.beginPath();
        ctx.arc(cx + 38 * scale, cy - 32 * scale, 7 * scale, 0, Math.PI * 2);
        ctx.fill();
        // Legs
        ctx.fillRect(cx - 30 * scale, cy + 12 * scale, 5 * scale, 22 * scale);
        ctx.fillRect(cx - 15 * scale, cy + 12 * scale, 5 * scale, 22 * scale);
        ctx.fillRect(cx + 10 * scale, cy + 12 * scale, 5 * scale, 22 * scale);
        ctx.fillRect(cx + 25 * scale, cy + 12 * scale, 5 * scale, 22 * scale);
    };

    drawCamelid(680, 440, 1.5, 0.35);
    drawCamelid(800, 470, 1.2, 0.32);

    // ── Yellow ochre dots (faded constellation pattern) ──
    ctx.fillStyle = 'rgba(180, 140, 60, 0.32)';
    const dotPositions = [
        [550, 150], [600, 130], [650, 165], [580, 200], [630, 220],
        [700, 180], [740, 160], [780, 200], [820, 220], [870, 180],
    ];
    for (const [x, y] of dotPositions) {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    // ── Faded handprint (red, very faint) ──
    ctx.fillStyle = 'rgba(130, 55, 35, 0.28)';
    const handCx = 130, handCy = 130;
    ctx.beginPath();
    ctx.ellipse(handCx, handCy + 25, 22, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + (i - 2) * 0.32;
        const fx = handCx + Math.cos(angle) * 30;
        const fy = handCy + Math.sin(angle) * 30 + 10;
        ctx.beginPath();
        ctx.ellipse(fx, fy, 5, 18, angle - Math.PI / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Final faint cracks (lines)
    ctx.strokeStyle = 'rgba(50, 40, 35, 0.25)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        const x1 = Math.random() * 1000;
        const y1 = Math.random() * 700;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + (Math.random() - 0.5) * 200, y1 + (Math.random() - 0.5) * 200);
        ctx.stroke();
    }

    // Convert to image
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const img = new Image();
    img.src = dataUrl;
    return img;
}

/** Async helper: returns the image once loaded. */
export function loadDemoImage(): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = generateDemoImage();
        if (img.complete) resolve(img);
        else {
            img.onload = () => resolve(img);
            img.onerror = reject;
        }
    });
}
