import React, { useEffect, useRef, useState } from 'react';
import { VISUAL_FILTERS } from '../utils/dstretch';

interface ControlsPanelProps {
    isVisible: boolean;
    previews: { mode: string; dataUrl: string; desc: string }[];
    currentMode: string;
    onSelectMode: (mode: string) => void;

    currentFilter: string;
    onSelectFilter: (filter: string) => void;

    filterParams: Record<string, Record<string, number>>;
    onFilterParamChange: (filterId: string, paramId: string, value: number) => void;
    onResetFilterParams: (filterId: string) => void;

    // DStretch advanced params
    dstretchGain: number;
    dstretchClip: number;
    onDstretchParamChange: (gain: number, clip: number) => void;
    onResetDstretchParams: () => void;
    isReprocessing: boolean;
}

type PanelState = 'compact' | 'full';

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
    isVisible,
    previews, currentMode, onSelectMode,
    currentFilter, onSelectFilter,
    filterParams, onFilterParamChange, onResetFilterParams,
    dstretchGain, dstretchClip, onDstretchParamChange, onResetDstretchParams, isReprocessing,
}) => {
    const dstretchAdjusted = dstretchGain !== 15 || Math.abs(dstretchClip - 0.005) > 1e-6;
    const dstretchHasAdjustables = currentMode !== 'ORIGINAL' && currentMode !== 'ADVANCED';
    const [panelState, setPanelState] = useState<PanelState>('compact');
    const dragStartY = useRef<number | null>(null);
    const dragStartState = useRef<PanelState>('compact');

    const activeFilterDef = VISUAL_FILTERS[currentFilter];
    const hasParams = activeFilterDef && activeFilterDef.params.length > 0;

    // The panel no longer auto-expands when changing mode/filter.
    // It only opens via the drag handle or the "Ajustes disponibles" hint button.
    // We still auto-collapse if the user removes all adjustables (ORIGINAL + Normal)
    // so the editor area gets the screen space back.
    useEffect(() => {
        if (!hasParams && !dstretchHasAdjustables) setPanelState('compact');
    }, [currentFilter, hasParams, dstretchHasAdjustables, currentMode]);

    if (!isVisible) return null;

    const isFull = panelState === 'full';

    // Drag-to-toggle on the handle (vertical swipe)
    const onHandlePointerDown = (e: React.PointerEvent) => {
        dragStartY.current = e.clientY;
        dragStartState.current = panelState;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onHandlePointerMove = (e: React.PointerEvent) => {
        if (dragStartY.current === null) return;
        const dy = e.clientY - dragStartY.current;
        if (dragStartState.current === 'compact' && dy < -30) setPanelState('full');
        else if (dragStartState.current === 'full' && dy > 30) setPanelState('compact');
    };
    const onHandlePointerUp = (e: React.PointerEvent) => {
        if (dragStartY.current === null) return;
        const dy = e.clientY - dragStartY.current;
        // Treat as tap if small movement
        if (Math.abs(dy) < 5) {
            setPanelState(prev => prev === 'compact' ? 'full' : 'compact');
        }
        dragStartY.current = null;
        try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    };

    return (
        <aside
            className={`w-full bg-tierra-900 border-t border-tierra-800 flex flex-col pb-[var(--safe-area-bottom)] z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] shrink-0 rounded-t-2xl overflow-hidden transition-[height] duration-300 ease-out ${isFull ? 'h-[68dvh]' : 'h-auto max-h-[42dvh]'}`}
        >
            {/* Drag handle (tap or swipe to toggle) */}
            <div
                className="shrink-0 flex flex-col items-center justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing select-none touch-none"
                onPointerDown={onHandlePointerDown}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerUp}
                onPointerCancel={onHandlePointerUp}
                aria-label="Expandir o contraer panel"
            >
                <div className={`h-1 rounded-full transition-all duration-200 ${isFull ? 'w-12 bg-ocre-500' : 'w-10 bg-tierra-600'}`}></div>
            </div>

            {/* DStretch Algorithms — compact in full mode */}
            <div data-tutorial="dstretch" className={`shrink-0 transition-all duration-300 ${isFull ? 'pt-1 pb-1.5' : 'pt-1 pb-2'}`}>
                <div className="text-[9px] font-bold text-tierra-500 uppercase tracking-widest pl-4 mb-1 flex items-center gap-2">
                    <span className="w-1 h-1 bg-ocre-400 rounded-full"></span>
                    Base DStretch
                </div>
                <div className="flex overflow-x-auto scroll-smooth px-4 gap-2 no-scrollbar pb-1">
                    {previews.map((preview) => {
                        const active = currentMode === preview.mode;
                        return (
                            <div
                                key={preview.mode}
                                onClick={() => onSelectMode(preview.mode)}
                                className={`cursor-pointer transition-all border-2 rounded-xl overflow-hidden shrink-0 relative flex flex-col items-center justify-center bg-tierra-800
                                ${isFull ? 'min-w-[48px] h-[48px]' : 'min-w-[58px] h-[58px]'}
                                ${active
                                        ? 'border-ocre-400 shadow-[0_4px_10px_rgba(59,130,246,0.5)] scale-105 z-10'
                                        : 'border-tierra-700 opacity-60 hover:opacity-100'}`}
                            >
                                <div className="absolute top-0 w-full bg-gradient-to-b from-black/80 to-transparent pt-0.5 pb-2 px-1 z-10 text-center">
                                    <span className="text-white text-[8px] font-black tracking-wider">{preview.mode}</span>
                                </div>
                                {preview.dataUrl ? (
                                    <img src={preview.dataUrl} alt={preview.desc} className="absolute inset-0 w-full h-full object-cover" />
                                ) : (
                                    <div className="text-[10px] text-tierra-500 animate-pulse">...</div>
                                )}
                            </div>
                        );
                    })}
                </div>

            </div>

            {/* Visual Filters */}
            <div data-tutorial="visual-filters" className="shrink-0 pb-2">
                <div className="text-[9px] font-bold text-tierra-500 uppercase tracking-widest pl-4 mb-1 flex items-center gap-2">
                    <span className="w-1 h-1 bg-ocre-500 rounded-full"></span>
                    Filtros Visuales
                </div>
                <div className="flex overflow-x-auto scroll-smooth px-4 gap-1.5 no-scrollbar pb-1">
                    {Object.keys(VISUAL_FILTERS).map((filter) => {
                        const isUltra = filter === 'Ultra';
                        const isActive = currentFilter === filter;
                        let btnClass = "bg-tierra-800 text-crema-400 border border-tierra-700/50 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all hover:bg-tierra-700";

                        if (isActive && !isUltra) btnClass = "bg-ocre-600/20 text-ocre-400 border-ocre-500/50 shadow-[0_2px_8px_rgba(16,185,129,0.2)] rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all scale-105";
                        else if (isActive && isUltra) btnClass = "bg-burdeo-600 text-white border-burdeo-500 shadow-[0_2px_12px_rgba(239,68,68,0.4)] rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all scale-105";
                        else if (!isActive && isUltra) btnClass = "bg-burdeo-950/30 text-burdeo-500 border border-burdeo-900/50 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all hover:bg-burdeo-900/30";

                        return (
                            <button key={filter} onClick={() => onSelectFilter(filter)} className={btnClass}>
                                {filter}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Sliders area — only visible in full mode */}
            {(hasParams || dstretchHasAdjustables) && isFull && (
                <div className="flex-1 min-h-0 px-4 pt-2 pb-3 border-t border-tierra-800/60 bg-tierra-950/40 flex flex-col gap-3 animate-in fade-in duration-200 overflow-y-auto no-scrollbar">

                    {/* DStretch params block */}
                    {dstretchHasAdjustables && (
                        <div className="flex flex-col gap-2.5">
                            <div className="flex justify-between items-center">
                                <div className="text-[10px] font-bold text-ocre-300 uppercase tracking-widest flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 bg-ocre-400 rounded-full ${isReprocessing ? 'animate-pulse' : ''}`}></span>
                                    Ajustes DStretch — {currentMode}
                                    {isReprocessing && <span className="w-2.5 h-2.5 rounded-full border border-ocre-300 border-t-transparent animate-spin"></span>}
                                </div>
                                <button
                                    onClick={onResetDstretchParams}
                                    disabled={!dstretchAdjusted || isReprocessing}
                                    className="text-[9px] text-crema-300 hover:text-ocre-300 uppercase tracking-wider font-bold px-2.5 py-1 rounded bg-tierra-800 hover:bg-tierra-700 transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Reset
                                </button>
                            </div>

                            {/* Intensidad */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-semibold text-crema-300 uppercase tracking-wider">Intensidad</label>
                                    <span className="text-[10px] font-mono bg-tierra-900 px-2 py-0.5 rounded text-ocre-300 border border-tierra-800 min-w-[3rem] text-center">
                                        {dstretchGain.toFixed(1)}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={1} max={50} step={0.5}
                                    value={dstretchGain}
                                    onChange={e => onDstretchParamChange(parseFloat(e.target.value), dstretchClip)}
                                    className="w-full h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-ocre-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-crema-50 [&::-webkit-slider-thumb]:shadow-lg"
                                    style={{
                                        background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${((dstretchGain - 1) / 49) * 100}%, rgb(51 65 85) ${((dstretchGain - 1) / 49) * 100}%, rgb(51 65 85) 100%)`
                                    }}
                                />
                            </div>

                            {/* Recorte */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-semibold text-crema-300 uppercase tracking-wider">Recorte percentil</label>
                                    <span className="text-[10px] font-mono bg-tierra-900 px-2 py-0.5 rounded text-ocre-300 border border-tierra-800 min-w-[3rem] text-center">
                                        {(dstretchClip * 100).toFixed(2)}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={0} max={5} step={0.05}
                                    value={dstretchClip * 100}
                                    onChange={e => onDstretchParamChange(dstretchGain, parseFloat(e.target.value) / 100)}
                                    className="w-full h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-ocre-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-crema-50 [&::-webkit-slider-thumb]:shadow-lg"
                                    style={{
                                        background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${(dstretchClip * 100 / 5) * 100}%, rgb(51 65 85) ${(dstretchClip * 100 / 5) * 100}%, rgb(51 65 85) 100%)`
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Divider when both blocks visible */}
                    {dstretchHasAdjustables && hasParams && (
                        <div className="h-px bg-tierra-800/60 mx-1"></div>
                    )}

                    {/* Visual filter params block */}
                    {hasParams && (
                        <div className="flex flex-col gap-2.5">
                            <div className="flex justify-between items-center">
                                <div className="text-[10px] font-bold text-ocre-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-ocre-500 rounded-full animate-pulse"></span>
                                    Ajustes — {currentFilter}
                                </div>
                                <button
                                    onClick={() => onResetFilterParams(currentFilter)}
                                    className="text-[9px] text-crema-300 hover:text-ocre-400 uppercase tracking-wider font-bold px-2.5 py-1 rounded bg-tierra-800 hover:bg-tierra-700 transition-colors flex items-center gap-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Reset
                                </button>
                            </div>
                            {activeFilterDef.params.map(param => {
                                const val = filterParams[currentFilter]?.[param.id] ?? param.default;
                                const pct = ((val - param.min) / (param.max - param.min)) * 100;
                                return (
                                    <div key={param.id} className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-semibold text-crema-300 uppercase tracking-wider">{param.label}</label>
                                            <span className="text-[10px] font-mono bg-tierra-900 px-2 py-0.5 rounded text-ocre-400 border border-tierra-800 min-w-[3rem] text-center">
                                                {val}{param.unit ?? ''}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min={param.min} max={param.max} step={param.step}
                                            value={val}
                                            onChange={(e) => onFilterParamChange(currentFilter, param.id, parseFloat(e.target.value))}
                                            className="w-full h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-ocre-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-crema-50 [&::-webkit-slider-thumb]:shadow-lg"
                                            style={{
                                                background: `linear-gradient(to right, rgb(16 185 129) 0%, rgb(16 185 129) ${pct}%, rgb(51 65 85) ${pct}%, rgb(51 65 85) 100%)`
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Hint when collapsed but adjustments are available */}
            {(hasParams || dstretchHasAdjustables) && !isFull && (
                <button
                    onClick={() => setPanelState('full')}
                    className={`shrink-0 mx-4 mb-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border flex items-center justify-center gap-1.5 transition-colors ${dstretchHasAdjustables
                        ? 'text-ocre-300 bg-tierra-900/30 hover:bg-tierra-900/50 border-tierra-800/40'
                        : 'text-ocre-400 bg-ocre-900/30 hover:bg-ocre-900/50 border-ocre-900/40'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                    Ajustes disponibles
                </button>
            )}
        </aside>
    );
};
