import React, { useState } from 'react';
import { VISUAL_FILTERS } from '../utils/dstretch';
import { ADVANCED_FILTERS } from '../utils/filters';

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

    // Advanced Filters Props
    advancedPreviews: Record<string, string>;
    activeAdvancedFilter: string | null;
    onSelectAdvancedFilter: (filterId: string) => void;
    advancedFilterParams: Record<string, Record<string, number>>;
    onParamChange: (filterId: string, paramId: string, val: number) => void;
    onApplyAdvancedFilter: () => void;
    isProcessing: boolean;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
    isVisible,
    previews, currentMode, onSelectMode,
    currentFilter, onSelectFilter,
    brightness, setBrightness,
    contrast, setContrast,
    intensity, setIntensity,
    onCropBtn,
    advancedPreviews, activeAdvancedFilter, onSelectAdvancedFilter,
    advancedFilterParams, onParamChange, onApplyAdvancedFilter, isProcessing
}) => {
    const [activeTab, setActiveTab] = useState<'DStretch' | 'Expertos' | 'Ajustes'>('DStretch');

    if (!isVisible) return null;

    const activeAdvancedDef = ADVANCED_FILTERS.find(f => f.id === activeAdvancedFilter);

    return (
        <aside className="h-[45dvh] w-full bg-slate-900 border-t border-slate-800 flex flex-col pb-[var(--safe-area-bottom)] z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] overflow-hidden shrink-0 rounded-t-2xl">

            {/* Modern Tab Selector */}
            <div className="flex px-4 pt-3 pb-2 gap-2 bg-slate-900 shrink-0 border-b border-slate-800">
                {(['DStretch', 'Expertos', 'Ajustes'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === tab
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Scrollable Content Area */}
            <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar relative">

                {/* DStretch Tab */}
                {activeTab === 'DStretch' && (
                    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* DStretch Algorithms */}
                        <div className="border-b border-slate-800 bg-slate-900/80 shrink-0 py-3">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-4 mb-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                Base DStretch
                            </div>
                            <div className="flex overflow-x-auto scroll-smooth px-4 gap-3 no-scrollbar pb-2">
                                {previews.map((preview) => (
                                    <div
                                        key={preview.mode}
                                        onClick={() => onSelectMode(preview.mode)}
                                        className={`cursor-pointer transition-all border-2 min-w-[70px] h-[70px] rounded-2xl overflow-hidden shrink-0 relative flex flex-col items-center justify-center bg-slate-800
                                        ${currentMode === preview.mode
                                                ? 'border-blue-500 shadow-[0_4px_12px_rgba(59,130,246,0.5)] scale-105 z-10'
                                                : 'border-slate-700 opacity-60 hover:opacity-100'}`}
                                    >
                                        <div className="absolute top-0 w-full bg-gradient-to-b from-black/80 to-transparent pt-1 pb-3 px-1 z-10 text-center">
                                            <span className="text-white text-[9px] font-black tracking-wider shadow-black">{preview.mode}</span>
                                        </div>
                                        {preview.dataUrl ? (
                                            <img src={preview.dataUrl} alt={preview.desc} className="absolute inset-0 w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-[10px] text-slate-500 animate-pulse">...</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Visual Filters */}
                        <div className="bg-slate-900/50 shrink-0 py-3 flex-1">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-4 mb-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                Filtros Visuales
                            </div>
                            <div className="flex overflow-x-auto scroll-smooth px-4 gap-2 no-scrollbar pb-2">
                                {Object.keys(VISUAL_FILTERS).map((filter) => {
                                    const isUltra = filter === 'Ultra';
                                    const isActive = currentFilter === filter;
                                    let btnClass = "bg-slate-800 text-slate-400 border border-slate-700/50 rounded-xl px-4 py-2 text-[11px] font-bold uppercase tracking-widest shrink-0 transition-all hover:bg-slate-700";

                                    if (isActive && !isUltra) btnClass = "bg-emerald-600/20 text-emerald-400 border-emerald-500/50 shadow-[0_2px_8px_rgba(16,185,129,0.2)] rounded-xl px-4 py-2 text-[11px] font-bold uppercase tracking-widest shrink-0 transition-all scale-105";
                                    else if (isActive && isUltra) btnClass = "bg-red-500 text-white border-red-400 shadow-[0_2px_12px_rgba(239,68,68,0.4)] rounded-xl px-4 py-2 text-[11px] font-bold uppercase tracking-widest shrink-0 transition-all scale-105";
                                    else if (!isActive && isUltra) btnClass = "bg-red-950/30 text-red-400 border border-red-900/50 rounded-xl px-4 py-2 text-[11px] font-bold uppercase tracking-widest shrink-0 transition-all hover:bg-red-900/30";

                                    return (
                                        <button key={filter} onClick={() => onSelectFilter(filter)} className={btnClass}>
                                            {filter}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Expertos Tab (Advanced Filters) */}
                {activeTab === 'Expertos' && (
                    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 h-full">
                        {/* Selector Carrusel */}
                        <div className="border-b border-slate-800 bg-slate-900/80 shrink-0 py-3">
                            <div className="flex overflow-x-auto scroll-smooth px-4 gap-3 no-scrollbar pb-2">
                                {ADVANCED_FILTERS.map(filter => {
                                    const isActive = activeAdvancedFilter === filter.id;
                                    const activeClass = isActive
                                        ? 'border-blue-500 shadow-[0_4px_12px_rgba(59,130,246,0.3)] scale-105 z-10 ring-2 ring-blue-500/50'
                                        : 'border-slate-700 opacity-60 hover:opacity-100';

                                    return (
                                        <div
                                            key={filter.id}
                                            onClick={() => onSelectAdvancedFilter(filter.id)}
                                            className={`cursor-pointer transition-all border-2 w-[80px] h-[85px] rounded-2xl overflow-hidden shrink-0 relative flex flex-col items-center justify-end bg-slate-800 ${activeClass}`}
                                        >
                                            {advancedPreviews[filter.id] ? (
                                                <img src={advancedPreviews[filter.id]} alt={filter.name} className="absolute inset-0 w-full h-full object-cover mix-blend-luminosity opacity-80" />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-white animate-spin"></div>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent"></div>
                                            <span className="relative text-[9px] text-white font-bold leading-tight text-center px-1 pb-1 z-10 w-full line-clamp-2">
                                                {filter.name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Parámetros del Filtro Experto Seleccionado */}
                        <div className="p-5 flex flex-col gap-4 flex-1">
                            {activeAdvancedDef ? (
                                <>
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="text-[12px] text-blue-400 font-bold uppercase tracking-widest">{activeAdvancedDef.name}</div>
                                        <button
                                            onClick={onApplyAdvancedFilter}
                                            disabled={isProcessing}
                                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-blue-900/40 disabled:opacity-50 flex gap-2 items-center"
                                        >
                                            {isProcessing ? 'Aplicando...' : 'Fijar Filtro'}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-snug -mt-2 mb-2">{activeAdvancedDef.description}</p>

                                    {activeAdvancedDef.params.map(param => (
                                        <div key={param.id} className="space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{param.label}</label>
                                                <span className="text-[10px] font-mono bg-slate-950 px-2 py-0.5 rounded text-blue-400 border border-slate-800">
                                                    {advancedFilterParams[activeAdvancedFilter as string]?.[param.id] ?? param.default}
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min={param.min} max={param.max} step={param.step}
                                                value={advancedFilterParams[activeAdvancedFilter as string]?.[param.id] ?? param.default}
                                                onChange={(e) => onParamChange(activeAdvancedDef.id, param.id, parseFloat(e.target.value))}
                                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-slate-50 [&::-webkit-slider-thumb]:shadow-md"
                                            />
                                        </div>
                                    ))}
                                    {activeAdvancedDef.params.length === 0 && (
                                        <div className="text-xs text-slate-500 italic text-center py-4 bg-slate-800/30 rounded-xl border border-slate-800">Este filtro aplica automáticamente.</div>
                                    )}
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-slate-500 text-xs text-center px-8">
                                    Selecciona un filtro experto del carrusel superior para ver sus ajustes avanzados.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Ajustes Globales Tab */}
                {activeTab === 'Ajustes' && (
                    <div className="px-5 py-6 flex flex-col gap-6 flex-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-col gap-6">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Brillo Global</span>
                                    <span className="text-[10px] text-blue-400 font-mono">{brightness}</span>
                                </div>
                                <input
                                    type="range" min="50" max="250" step="1" value={brightness}
                                    onChange={(e) => setBrightness(Number(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-slate-50 [&::-webkit-slider-thumb]:shadow-md"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Contraste Global</span>
                                    <span className="text-[10px] text-blue-400 font-mono">{contrast}</span>
                                </div>
                                <input
                                    type="range" min="50" max="250" step="1" value={contrast}
                                    onChange={(e) => setContrast(Number(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-slate-50 [&::-webkit-slider-thumb]:shadow-md"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Intensidad Visual</span>
                                    <span className="text-[10px] text-red-400 font-mono">{intensity}%</span>
                                </div>
                                <input
                                    type="range" min="0" max="100" step="1" value={intensity}
                                    onChange={(e) => setIntensity(Number(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-slate-50 [&::-webkit-slider-thumb]:shadow-md"
                                />
                            </div>
                        </div>

                        {/* Recortar Tool Trigger moved here since it belongs to manual global adjusting */}
                        <div className="mt-4 pt-4 border-t border-slate-800">
                            <button
                                onClick={onCropBtn}
                                className="w-full bg-slate-800 text-slate-300 py-3 rounded-xl text-xs font-bold uppercase tracking-widest active:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                                </svg>
                                Herramienta de Recorte
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};
