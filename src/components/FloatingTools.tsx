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

    // Stop ALL pointer events from bubbling to the viewport gesture handler
    // (so a slight finger movement on these buttons doesn't pan/zoom the image).
    const swallow = (e: React.PointerEvent | React.TouchEvent) => e.stopPropagation();

    const handleEyeDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        // Lock the pointer to this button — even if the finger drifts off,
        // pointer events keep firing here until release.
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
        onShowOriginalStart();
    };

    const handleEyeUp = (e: React.PointerEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
        onShowOriginalEnd();
    };

    return (
        <div
            className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10"
            onPointerDown={swallow}
            onTouchStart={swallow}
        >
            {/* Eye — hold to see original. Big touch zone (64px) with a 44px visible circle inside. */}
            <button
                data-tutorial="eye"
                onPointerDown={handleEyeDown}
                onPointerUp={handleEyeUp}
                onPointerCancel={handleEyeUp}
                onLostPointerCapture={() => onShowOriginalEnd()}
                onContextMenu={(e) => e.preventDefault()}
                className="w-16 h-16 flex justify-center items-center select-none"
                style={{ touchAction: 'none', WebkitUserSelect: 'none' }}
                title="Mantener para ver original"
            >
                <div
                    className={`w-12 h-12 rounded-full flex justify-center items-center border shadow-lg backdrop-blur-sm transition-all duration-200 ${isShowingOriginal
                        ? 'bg-ocre-400 border-ocre-300 text-white scale-110'
                        : 'bg-tierra-800/85 border-tierra-600 text-white'
                        }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                </div>
            </button>

            {/* Bake — same large touch zone for consistency */}
            <button
                data-tutorial="bake"
                onPointerDown={swallow}
                onClick={(e) => { e.stopPropagation(); onBake(); }}
                className="w-16 h-16 flex justify-center items-center select-none"
                style={{ touchAction: 'manipulation' }}
                title="Fijar Base (Acumular Filtros)"
            >
                <div className="w-12 h-12 rounded-full bg-tierra-800/85 text-ocre-300 border border-ocre-500 flex justify-center items-center shadow-lg backdrop-blur-sm transition-all duration-200 active:bg-ocre-500 active:text-tierra-900">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                </div>
            </button>

            {/* Reset */}
            <button
                data-tutorial="reset"
                onPointerDown={swallow}
                onClick={(e) => { e.stopPropagation(); onReset(); }}
                className="w-16 h-16 flex justify-center items-center select-none"
                style={{ touchAction: 'manipulation' }}
                title="Limpiar todos los filtros"
            >
                <div className="w-12 h-12 rounded-full bg-burdeo-600 text-white border border-burdeo-500 flex justify-center items-center shadow-lg backdrop-blur-sm transition-all duration-200 active:bg-burdeo-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </div>
            </button>
        </div>
    );
};
