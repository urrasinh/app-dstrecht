import React from 'react';

export const AboutModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-tierra-900 border border-tierra-700 rounded-2xl max-w-sm w-full shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-tierra-800 shrink-0">
                    <h2 className="text-base font-bold text-white">Acerca de</h2>
                    <button onClick={onClose} className="text-crema-400 hover:text-white p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="px-6 py-6 flex flex-col items-center text-center gap-4">
                    {/* Foundation logo → links to the website */}
                    <a href="https://fundacionpaqarina.com" target="_blank" rel="noopener noreferrer" title="Fundación Paqarina">
                        <img src="/paqarina-vertical.png" alt="Fundación Paqarina" className="h-20 object-contain" />
                    </a>

                    <div className="space-y-0.5">
                        <h3 className="text-white font-bold text-lg leading-tight">Filtros Avanzados para Pictografías</h3>
                        <p className="text-ocre-400 text-xs font-semibold uppercase tracking-widest">WebApp DStretch · Versión 2.1</p>
                    </div>

                    <div className="w-12 h-px bg-tierra-700"></div>

                    <div className="space-y-1 text-sm text-crema-300">
                        <p>Desarrollado por <strong className="text-white">Guillermo Urra Bustamante</strong></p>
                        <a
                            href="mailto:contacto@fundacionpaqarina.com"
                            className="text-burdeo-400 hover:text-burdeo-300 underline block"
                        >
                            contacto@fundacionpaqarina.com
                        </a>
                    </div>

                    <a
                        href="https://fundacionpaqarina.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-tierra-400 hover:text-crema-300 transition-colors"
                    >
                        Fundación Paqarina · 2026
                    </a>
                </div>
            </div>
        </div>
    );
};
