import React from 'react';

interface ResolutionModalProps {
    isOpen: boolean;
    dim: string;
    mp: string;
    onOptimize: () => void;
    onNative: () => void;
}

export const ResolutionModal: React.FC<ResolutionModalProps> = ({ isOpen, dim, mp, onOptimize, onNative }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-red-900/50 flex items-center justify-center text-red-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-white">Tamaño de Imagen</h3>
                </div>

                <div className="bg-slate-900/50 p-3 rounded-lg mb-4 border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1 uppercase tracking-widest font-bold">Detectado:</p>
                    <p className="text-lg text-red-400 font-mono font-bold">{dim}</p>
                    <p className="text-sm text-slate-300">{mp}</p>
                </div>

                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                    Trabajar en <strong className="text-slate-200">Resolución Nativa</strong> te dará máxima calidad, pero el cálculo demorará. <strong className="text-slate-200">Optimizar (2048px)</strong> es rápido y previene que el teléfono se cierre por falta de memoria.
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onOptimize}
                        className="w-full bg-red-600 text-white py-3.5 rounded-xl text-sm font-bold border border-red-500 active:bg-red-700 flex justify-center gap-2 items-center"
                    >
                        Optimizar Rápido (2048px)
                    </button>
                    <button
                        onClick={onNative}
                        className="w-full bg-slate-700 text-white py-3.5 rounded-xl text-sm font-bold border border-slate-600 active:bg-slate-600 flex justify-center gap-2 items-center"
                    >
                        Mantener Nativa
                    </button>
                </div>
            </div>
        </div>
    );
};
