import React, { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

interface FirstTimeWelcomeProps {
    isOpen: boolean;
    onStartTutorial: () => void;
    onSkipTutorial: () => void;
}

export const FirstTimeWelcome: React.FC<FirstTimeWelcomeProps> = ({ isOpen, onStartTutorial, onSkipTutorial }) => {
    const install = useInstallPrompt();
    const [installing, setInstalling] = useState(false);

    if (!isOpen) return null;

    const handleInstall = async () => {
        setInstalling(true);
        try { await install.promptInstall(); } finally { setInstalling(false); }
    };

    return (
        <div className="fixed inset-0 z-[350] bg-tierra-950 flex flex-col items-center justify-center p-6 overflow-y-auto">
            <div className="w-full max-w-md flex flex-col gap-5">
                {/* Hero */}
                <div className="text-center">
                    <img src="/paqarina-horizontal.png" alt="Paqarina" className="h-12 mx-auto mb-4 object-contain" />
                    <h1 className="text-2xl font-bold text-white tracking-tight">¡Bienvenido!</h1>
                    <p className="text-sm text-crema-400 mt-2 leading-relaxed">
                        Filtro DStretch es una herramienta para realzar pictografías y arte rupestre
                        usando decorrelación de colores.
                    </p>
                </div>

                {/* Offline note */}
                <div className="bg-tierra-900/60 border border-tierra-700 rounded-2xl p-4 flex gap-3 items-start">
                    <div className="bg-ocre-500/15 text-ocre-400 p-2 rounded-xl shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12.55a11 11 0 0114 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white">Funciona sin internet</h3>
                        <p className="text-xs text-crema-400 leading-relaxed mt-0.5">
                            Una vez instalada, podés procesar y previsualizar imágenes sin conexión. Las subidas se guardan y se envían cuando vuelva la red.
                        </p>
                    </div>
                </div>

                {/* Install card */}
                <div className="bg-tierra-900/60 border border-tierra-700 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex gap-3 items-start">
                        <div className="bg-ocre-500/15 text-ocre-400 p-2 rounded-xl shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-white">Instala la app</h3>
                            <p className="text-xs text-crema-400 leading-relaxed mt-0.5">
                                {install.installed
                                    ? 'Ya está instalada en tu dispositivo. ✓'
                                    : install.isIOS
                                        ? 'En Safari, toca Compartir ⬆️ y luego "Añadir a pantalla de inicio".'
                                        : 'Acceso rápido desde el inicio, sin barra del navegador, modo pantalla completa.'}
                            </p>
                        </div>
                    </div>
                    {!install.installed && !install.isIOS && (
                        <button
                            onClick={handleInstall}
                            disabled={!install.canInstallNative || installing}
                            className="w-full bg-burdeo-600 hover:bg-ocre-400 active:bg-burdeo-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {installing ? 'Instalando…' : install.canInstallNative ? 'Instalar ahora' : 'No disponible en este navegador'}
                        </button>
                    )}
                </div>

                {/* Two choices */}
                <div className="flex flex-col gap-2 mt-1">
                    <p className="text-xs text-crema-400 text-center mb-1">
                        ¿Cómo quieres empezar?
                    </p>
                    <button
                        onClick={onStartTutorial}
                        className="w-full bg-ocre-600 hover:bg-ocre-500 active:bg-ocre-700 text-white text-sm font-bold py-3.5 rounded-xl transition-colors uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.5M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.5h.01" />
                        </svg>
                        Ver tutorial
                    </button>
                    <button
                        onClick={onSkipTutorial}
                        className="w-full bg-tierra-800 hover:bg-tierra-700 active:bg-tierra-700 text-crema-200 text-sm font-bold py-3.5 rounded-xl transition-colors uppercase tracking-wider flex items-center justify-center gap-2 border border-tierra-700"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        </svg>
                        Cargar foto directamente
                    </button>
                </div>
            </div>
        </div>
    );
};
