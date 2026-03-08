import React from 'react';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    camera: string;
    date: string;
    resInfo: string;
    gpsFull: string;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, camera, date, resInfo, gpsFull }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Información de Imagen
                </h3>

                <div className="space-y-3 text-sm">
                    <div className="flex flex-col bg-slate-900/50 p-2.5 rounded-lg border border-slate-700">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cámara / Dispositivo</span>
                        <span className="text-slate-200">{camera}</span>
                    </div>
                    <div className="flex flex-col bg-slate-900/50 p-2.5 rounded-lg border border-slate-700">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Fecha de Captura</span>
                        <span className="text-slate-200">{date}</span>
                    </div>
                    <div className="flex flex-col bg-slate-900/50 p-2.5 rounded-lg border border-slate-700">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Resolución Original</span>
                        <span className="text-red-300 font-mono">{resInfo}</span>
                    </div>
                    <div className="flex flex-col bg-slate-900/50 p-2.5 rounded-lg border border-slate-700">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Coordenadas GPS</span>
                        <span className="text-slate-200">{gpsFull}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
