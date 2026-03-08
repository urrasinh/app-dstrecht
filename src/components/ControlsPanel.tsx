import React from 'react';
import { VISUAL_FILTERS } from '../utils/dstretch';

interface ControlsPanelProps {
    isVisible: boolean;
    previews: { mode: string; dataUrl: string; desc: string }[];
    currentMode: string;
    onSelectMode: (mode: string) => void;

    currentFilter: string;
    onSelectFilter: (filter: string) => void;

    brightness: number;
    setBrightness: (val: number) => void;

    contrast: number;
    setContrast: (val: number) => void;

    intensity: number;
    setIntensity: (val: number) => void;

    onCropBtn: () => void;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
    isVisible,
    previews,
    currentMode,
    onSelectMode,
    currentFilter,
    onSelectFilter,
    brightness, setBrightness,
    contrast, setContrast,
    intensity, setIntensity,
    onCropBtn
}) => {
    if (!isVisible) return null;

    return (
        <aside className="h-[45dvh] w-full bg-slate-800 border-t border-slate-700 flex flex-col pb-[var(--safe-area-bottom)] z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] overflow-y-auto shrink-0">

            {/* Algorithms */}
            <div className="border-b border-slate-700 bg-slate-800/80 shrink-0">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-4 pt-2">Algoritmos DStretch</div>
                <div className="flex overflow-x-auto scroll-smooth px-3.5 py-2.5 gap-2.5 no-scrollbar">
                    {previews.map((preview) => (
                        <div
                            key={preview.mode}
                            onClick={() => onSelectMode(preview.mode)}
                            className={`cursor-pointer transition-all border-2 min-w-[65px] h-[65px] rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center bg-slate-900
                ${currentMode === preview.mode
                                    ? 'border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)] opacity-100 scale-105 z-10'
                                    : 'border-transparent opacity-50'}`}
                        >
                            <div className="absolute top-0 right-0 bg-blue-500 text-white text-[8px] px-1 rounded-bl font-bold z-10">{preview.mode}</div>
                            {preview.dataUrl ? (
                                <img src={preview.dataUrl} alt={preview.desc} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-[10px] text-slate-500">...</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Visual Filters */}
            <div className="border-b border-slate-700 bg-slate-800/40 shrink-0">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-4 pt-2">Filtros Visuales</div>
                <div className="flex overflow-x-auto scroll-smooth px-3.5 py-2.5 gap-2.5 no-scrollbar">
                    {Object.keys(VISUAL_FILTERS).map((filter) => {
                        const isUltra = filter === 'Ultra';
                        const isActive = currentFilter === filter;
                        let btnClass = "bg-slate-700 text-slate-300 border border-slate-600 rounded-lg px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide shrink-0 transition-all";

                        if (isActive && !isUltra) btnClass = "bg-blue-500 text-white border-blue-400 shadow-[0_2px_8px_rgba(59,130,246,0.4)] rounded-lg px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide shrink-0 transition-all";
                        else if (isActive && isUltra) btnClass = "bg-red-500 text-white border-red-400 shadow-[0_2px_8px_rgba(239,68,68,0.4)] rounded-lg px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide shrink-0 transition-all";
                        else if (!isActive && isUltra) btnClass = "bg-slate-700 text-red-300 border-red-900 rounded-lg px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide shrink-0 transition-all";

                        return (
                            <button
                                key={filter}
                                onClick={() => onSelectFilter(filter)}
                                className={btnClass}
                            >
                                {filter}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Sliders and Actions */}
            <div className="px-5 py-3 flex flex-col gap-3 flex-1">
                <div className="flex gap-5">
                    <div className="flex-1">
                        <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Brillo</div>
                        <input
                            type="range"
                            min="50" max="250" step="1"
                            value={brightness}
                            onChange={(e) => setBrightness(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-slate-50 [&::-webkit-slider-thumb]:-mt-2.5"
                        />
                    </div>
                    <div className="flex-1">
                        <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Contraste</div>
                        <input
                            type="range"
                            min="50" max="250" step="1"
                            value={contrast}
                            onChange={(e) => setContrast(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-slate-50 [&::-webkit-slider-thumb]:-mt-2.5"
                        />
                    </div>
                </div>

                <div className="mt-1">
                    <div className="flex justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Intensidad de Filtro</span>
                        <span className="text-[10px] text-red-400 font-mono">{intensity}%</span>
                    </div>
                    <input
                        type="range"
                        min="0" max="100" step="1"
                        value={intensity}
                        onChange={(e) => setIntensity(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-slate-50 [&::-webkit-slider-thumb]:-mt-2.5"
                    />
                </div>

                <button
                    onClick={onCropBtn}
                    className="w-full bg-red-600/20 text-red-400 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest active:bg-red-600 active:text-white transition-colors border border-red-500/50 flex items-center justify-center gap-2 mt-auto"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                    </svg>
                    Recortar a la Vista Actual
                </button>
            </div>
        </aside>
    );
};
