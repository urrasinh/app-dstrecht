import { useEffect, useState } from 'react';

interface SpinnerInfo {
    dim?: string;
    mp?: string;
    camera?: string;
    gps?: string;
    date?: string;
}

interface SpinnerProps {
    progress: number;
    message: string;
    /** Data URL of the uploaded photo, shown with a bottom→top color fill reveal. */
    imageSrc?: string | null;
    /** Detected metadata shown as chips under the image. */
    info?: SpinnerInfo;
}

// Field-photography tips rotated during processing. The RAW/TIFF one comes
// first because it has the biggest impact on DStretch quality.
const TIPS: { title: string; text: string }[] = [
    { title: 'Usa RAW o TIFF', text: 'Evita el JPG cuando puedas: su compresión crea artefactos que DStretch amplifica como “ruido” falso, fácil de confundir con pigmento.' },
    { title: 'Luz pareja', text: 'Fotografía con luz difusa: sin sol directo ni sombras duras sobre el panel.' },
    { title: 'Cámara paralela', text: 'Ubica el lente paralelo a la superficie para reducir la distorsión de perspectiva.' },
    { title: 'Activa el GPS', text: 'Si tu cámara guarda la ubicación, la coordenada queda registrada junto a la imagen.' },
    { title: 'Compara modos', text: 'YDS, YBK, CRGB… cada matriz realza pigmentos distintos. Prueba varios antes de decidir.' },
];

// Lightweight inline pictograph (no network request) — three stylized figures
// echoing rock-art bird/camelid motifs. Used as the loading graphic when there
// is no uploaded photo (e.g. baking, rotating, cropping).
const Pictograph = ({ color }: { color: string }) => (
    <svg viewBox="0 0 150 80" className="w-full h-full" fill="none" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
        {[{ x: 4, y: 6, s: 1.05 }, { x: 56, y: 0, s: 1.3 }, { x: 104, y: 30, s: 0.78 }].map((f, i) => (
            <g key={i} transform={`translate(${f.x} ${f.y}) scale(${f.s})`}>
                <ellipse cx="20" cy="22" rx="15" ry="6" fill={color} stroke="none" />
                <path d="M33 18 L38 5" />
                <circle cx="39" cy="4" r="3.2" fill={color} stroke="none" />
                <path d="M41 4 L48 3" />
                <path d="M11 27 L10 35 M18 27 L18 36 M26 27 L27 35" />
            </g>
        ))}
    </svg>
);

export const Spinner: React.FC<SpinnerProps> = ({ progress, message, imageSrc, info }) => {
    const [tipIdx, setTipIdx] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 5000);
        return () => clearInterval(id);
    }, []);

    const pct = Math.max(0, Math.min(100, Math.round(progress)));
    const clip = `inset(${100 - pct}% 0 0 0)`;
    const tip = TIPS[tipIdx];

    const chips: string[] = [];
    if (info?.dim) chips.push(info.dim);
    if (info?.mp) chips.push(info.mp);
    if (info?.camera) chips.push(info.camera);
    if (info?.gps) chips.push('📍 ' + info.gps);
    if (info?.date) chips.push(info.date);

    return (
        <div className="fixed inset-0 bg-tierra-950/97 z-[100] flex flex-col items-center justify-center gap-4 backdrop-blur-sm text-center p-5 overflow-y-auto">
            {/* Image reveal (or pictograph fallback) */}
            <div className="relative rounded-2xl overflow-hidden border border-burdeo-800/60 shadow-2xl bg-tierra-950 w-[230px] max-w-[78vw]">
                {imageSrc ? (
                    <>
                        <img
                            src={imageSrc}
                            alt=""
                            draggable={false}
                            className="block w-full h-auto max-h-[36dvh] object-contain select-none"
                            style={{ filter: 'grayscale(1) brightness(0.4)' }}
                        />
                        <img
                            src={imageSrc}
                            alt=""
                            draggable={false}
                            className="absolute inset-0 w-full h-full object-contain select-none"
                            style={{ clipPath: clip, WebkitClipPath: clip, transition: 'clip-path 0.35s linear' }}
                        />
                    </>
                ) : (
                    <div className="relative w-full h-[150px]">
                        <div className="absolute inset-0 p-5 opacity-25"><Pictograph color="#b18f6a" /></div>
                        <div
                            className="absolute inset-0 p-5"
                            style={{ clipPath: clip, WebkitClipPath: clip, transition: 'clip-path 0.35s linear' }}
                        >
                            <Pictograph color="#ad3f53" />
                        </div>
                    </div>
                )}
                {/* Scan line at the fill boundary */}
                <div
                    className="absolute left-0 right-0 pointer-events-none"
                    style={{
                        top: `${100 - pct}%`,
                        height: 2,
                        background: 'rgb(201 168 97)',
                        boxShadow: '0 0 10px 2px rgba(201,168,97,0.8)',
                        transition: 'top 0.35s linear',
                    }}
                />
            </div>

            {/* Progress + message */}
            <div className="flex flex-col items-center gap-1.5 w-[230px] max-w-[78vw]">
                <div className="flex items-baseline gap-2">
                    <span className="text-burdeo-500 text-3xl font-mono font-bold tabular-nums">{pct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-tierra-800 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-burdeo-600"
                        style={{ width: `${pct}%`, transition: 'width 0.35s linear' }}
                    />
                </div>
                <p className="text-[11px] font-bold text-crema-200 tracking-widest uppercase mt-1">{message}</p>
            </div>

            {/* Detected metadata chips */}
            {chips.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 max-w-[320px]">
                    {chips.map((c, i) => (
                        <span
                            key={i}
                            className="bg-tierra-800/70 border border-tierra-700 text-crema-300 text-[10px] px-2 py-0.5 rounded-md font-mono max-w-[150px] truncate"
                            title={c}
                        >
                            {c}
                        </span>
                    ))}
                </div>
            )}

            {/* Rotating tip */}
            <div className="max-w-[320px] w-full bg-tierra-900/70 border border-tierra-800 rounded-xl px-4 py-3 text-left">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm leading-none">💡</span>
                    <span className="text-ocre-400 text-[10px] font-bold uppercase tracking-widest">Consejo · {tip.title}</span>
                </div>
                <p className="text-[11px] text-crema-300 leading-relaxed">{tip.text}</p>
            </div>

            <p className="text-[10px] text-tierra-300 max-w-[260px] leading-relaxed">
                No cierres la ventana. Esto puede tardar varios segundos según el tamaño de la foto.
            </p>
        </div>
    );
};
