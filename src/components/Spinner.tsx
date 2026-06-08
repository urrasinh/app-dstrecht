import { useEffect, useState } from 'react';

interface SpinnerInfo {
    dim?: string;
    mp?: string;
    camera?: string;
    date?: string;
}

interface SpinnerProps {
    progress: number;
    message: string;
    /** Detected metadata shown as chips (no GPS). */
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

// Three rock-art birds (vectorized from the reference pictograph) — long beak,
// hollow eye, angular body, two legs, descending in scale left→right. Pure
// inline SVG (no network request). `eye` punches the hollow eye against the bg.
const Birds = ({ color, eye }: { color: string; eye: string }) => {
    const Bird = ({ t }: { t: string }) => (
        <g transform={t}>
            {/* beak + long neck reaching up-left */}
            <path d="M33 16 L2 5 L5 12 L32 22 Z" fill={color} />
            {/* angular body + tail triangle */}
            <path d="M34 23 L24 37 L41 34 L30 53 L66 29 L45 31 Z" fill={color} />
            {/* two legs */}
            <path d="M45 44 L43 61 M54 42 L55 59" stroke={color} strokeWidth={3.4} strokeLinecap="round" fill="none" />
            {/* head */}
            <circle cx="39" cy="17" r="8.5" fill={color} />
            {/* hollow eye */}
            <circle cx="40" cy="16" r="3.1" fill={eye} />
        </g>
    );
    return (
        <svg viewBox="0 0 168 104" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <Bird t="translate(2 16) scale(1)" />
            <Bird t="translate(52 2) scale(1.16)" />
            <Bird t="translate(110 40) scale(0.72)" />
        </svg>
    );
};

export const Spinner: React.FC<SpinnerProps> = ({ progress, message, info }) => {
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
    if (info?.date) chips.push(info.date);

    return (
        <div className="fixed inset-0 bg-tierra-950/97 z-[100] flex flex-col items-center justify-center gap-4 backdrop-blur-sm text-center p-5 overflow-y-auto">
            {/* Foundation logo */}
            <img src="/paqarina-horizontal.png" alt="Fundación Paqarina" className="h-7 object-contain opacity-90" />

            {/* Birds pictograph with bottom→top color fill reveal */}
            <div className="relative w-[210px] h-[130px] max-w-[72vw]">
                <div className="absolute inset-0"><Birds color="#3e3024" eye="#0a0806" /></div>
                <div
                    className="absolute inset-0"
                    style={{ clipPath: clip, WebkitClipPath: clip, transition: 'clip-path 0.35s linear' }}
                >
                    <Birds color="#ad3f53" eye="#0a0806" />
                </div>
                {/* scan line at the fill boundary */}
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
                <span className="text-burdeo-500 text-3xl font-mono font-bold tabular-nums">{pct}%</span>
                <div className="w-full h-1.5 rounded-full bg-tierra-800 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-burdeo-600"
                        style={{ width: `${pct}%`, transition: 'width 0.35s linear' }}
                    />
                </div>
                <p className="text-[11px] font-bold text-crema-200 tracking-widest uppercase mt-1">{message}</p>
            </div>

            {/* Detected metadata chips (no coordinates) */}
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
