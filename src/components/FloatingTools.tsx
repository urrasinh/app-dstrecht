import React from 'react';

interface FloatingToolsProps {
    isVisible: boolean;
    onShowOriginalStart: () => void;
    onShowOriginalEnd: () => void;
    onBake: () => void;
    onReset: () => void;
    isShowingOriginal: boolean;
}

export const FloatingTools: React.FC<FloatingToolsProps> = ({
    isVisible,
    onShowOriginalStart,
    onShowOriginalEnd,
    onBake,
    onReset,
    isShowingOriginal
}) => {
    if (!isVisible) return null;

    return (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3.5 z-10">
            <button
                onPointerDown={onShowOriginalStart}
                onPointerUp={onShowOriginalEnd}
                onPointerLeave={onShowOriginalEnd}
                className={`w-11 h-11 rounded-full flex justify-center items-center border shadow-lg backdrop-blur-sm transition-all duration-200 ${isShowingOriginal
                        ? 'bg-blue-500 border-blue-400 text-white'
                        : 'bg-slate-800/85 border-slate-600 text-white'
                    }`}
                title="Mantener para ver original"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            </button>

            <button
                onClick={onBake}
                className="w-11 h-11 rounded-full bg-slate-800/85 text-yellow-300 border border-yellow-600 flex justify-center items-center shadow-lg backdrop-blur-sm transition-all duration-200 active:bg-yellow-600 active:text-white"
                title="Fijar Base (Acumular Filtros)"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
            </button>

            <button
                onClick={onReset}
                className="w-11 h-11 rounded-full bg-red-500 text-white border border-red-400 flex justify-center items-center shadow-lg backdrop-blur-sm transition-all duration-200 active:bg-red-600"
                title="Limpiar todos los filtros"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            </button>
        </div>
    );
};
