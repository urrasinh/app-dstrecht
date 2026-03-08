import React, { useState } from 'react';
import type { AdvancedFilterDef, AdvancedFilterCategory } from '../types';

interface AdvancedFiltersPanelProps {
    isVisible: boolean;
    onClose: () => void;
    filters: AdvancedFilterDef[];
    activeFilterId: string | null;
    filterParams: Record<string, Record<string, number>>;
    onFilterSelect: (filterId: string) => void;
    onParamChange: (filterId: string, paramId: string, value: number) => void;
    onApply: () => void;
    isProcessing: boolean;
}

const CATEGORIES: { id: AdvancedFilterCategory; label: string; icon: React.ReactNode }[] = [
    {
        id: 'GLOBAL',
        label: 'Ajustes Globales',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        )
    },
    {
        id: 'CHANNELS',
        label: 'Espacio de Color',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
        )
    },
    {
        id: 'EDGES',
        label: 'Textura y Bordes',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
        )
    }
];

export function AdvancedFiltersPanel({
    isVisible,
    onClose,
    filters,
    activeFilterId,
    filterParams,
    onFilterSelect,
    onParamChange,
    onApply,
    isProcessing
}: AdvancedFiltersPanelProps) {
    const [activeCategory, setActiveCategory] = useState<AdvancedFilterCategory>('GLOBAL');

    if (!isVisible) return null;

    const categoryFilters = filters.filter(f => f.category === activeCategory);
    const activeDef = filters.find(f => f.id === activeFilterId);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end pointer-events-none">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />

            <div className="bg-slate-900 w-full rounded-t-3xl border-t border-slate-700 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] pointer-events-auto flex flex-col max-h-[85vh] transition-transform duration-300 transform translate-y-0">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                        Filtros Avanzados
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden min-h-0">

                    {/* Categories Sidebar */}
                    <div className="w-20 border-r border-slate-800 flex flex-col items-center py-4 gap-4 overflow-y-auto shrink-0 bg-slate-950/50">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all ${activeCategory === cat.id
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                    }`}
                                title={cat.label}
                            >
                                {cat.icon}
                                <span className="text-[9px] font-bold text-center leading-tight tracking-wider">{cat.label.split(' ')[0]}</span>
                            </button>
                        ))}
                    </div>

                    {/* Filters List & Params */}
                    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-900 p-4 gap-6">

                        {/* Horizontal Filter Selector */}
                        <div className="flex gap-2 overflow-x-auto pb-2 snap-x hide-scrollbar">
                            {categoryFilters.map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => onFilterSelect(filter.id)}
                                    className={`snap-center shrink-0 px-4 py-3 rounded-xl border text-sm font-semibold transition-all flex flex-col gap-1 items-start w-[140px] text-left
                    ${activeFilterId === filter.id
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30'
                                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}
                                >
                                    <span className="block truncate w-full">{filter.name}</span>
                                    <span className={`text-[10px] font-normal opacity-80 line-clamp-2 leading-tight ${activeFilterId === filter.id ? 'text-blue-100' : 'text-slate-500'}`}>
                                        {filter.description}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Active Filter Parameters */}
                        {activeDef ? (
                            <div className="space-y-6 bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                                <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-4">
                                    <h3 className="text-white font-bold">{activeDef.name}</h3>
                                    <button
                                        onClick={onApply}
                                        disabled={isProcessing}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                Aplicando...
                                            </>
                                        ) : (
                                            <>Aplicar Filtro</>
                                        )}
                                    </button>
                                </div>

                                {activeDef.params.map(param => (
                                    <div key={param.id} className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-semibold text-slate-300">{param.label}</label>
                                            <span className="text-xs font-mono bg-slate-950 px-2 py-1 rounded text-blue-400 border border-slate-800">
                                                {filterParams[activeFilterId as string]?.[param.id] ?? param.default}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min={param.min}
                                            max={param.max}
                                            step={param.step}
                                            value={filterParams[activeFilterId as string]?.[param.id] ?? param.default}
                                            onChange={(e) => onParamChange(activeDef.id, param.id, parseFloat(e.target.value))}
                                            className="w-full accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                ))}

                                {activeDef.params.length === 0 && (
                                    <p className="text-slate-500 text-sm italic text-center py-4">Este filtro no requiere parámetros adicionales y es automático.</p>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 pb-10">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                <p className="text-sm">Selecciona una herramienta para ajustar sus parámetros</p>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
        </div>
    );
}
