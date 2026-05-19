import React, { useEffect, useState } from 'react';

interface BIPEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface FirstTimeWelcomeProps {
    isOpen: boolean;
    onStartTutorial: () => void;
    onSkipTutorial: () => void;
}

function isIOSSafari(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.maxTouchPoints > 1 && /Mac/.test(ua));
    const isStandalone = (window.matchMedia?.('(display-mode: standalone)').matches) ||
        (navigator as { standalone?: boolean }).standalone === true;
    return isIOS && !isStandalone;
}

function isInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(display-mode: standalone)').matches ||
        (navigator as { standalone?: boolean }).standalone === true;
}

export const FirstTimeWelcome: React.FC<FirstTimeWelcomeProps> = ({ isOpen, onStartTutorial, onSkipTutorial }) => {
    const [bipEvent, setBipEvent] = useState<BIPEvent | null>(null);
    const [installed, setInstalled] = useState(false);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setInstalled(isInstalled());
        const handler = (e: Event) => {
            e.preventDefault();
            setBipEvent(e as BIPEvent);
        };
        window.addEventListener('beforeinstallprompt', handler);
        const onInstalled = () => setInstalled(true);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const ios = isIOSSafari();

    const handleInstall = async () => {
        if (!bipEvent) return;
        setInstalling(true);
        try {
            await bipEvent.prompt();
            await bipEvent.userChoice;
            setBipEvent(null);
        } finally {
            setInstalling(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[350] bg-slate-950 flex flex-col items-center justify-center p-6 overflow-y-auto">
            <div className="w-full max-w-md flex flex-col gap-5">
                {/* Hero */}
                <div className="text-center">
                    <img src="/paqarina-vertical.png" alt="Paqarina" className="h-24 mx-auto mb-3 object-contain" />
                    <h1 className="text-2xl font-bold text-white tracking-tight">¡Bienvenido!</h1>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                        Filtro DStretch es una herramienta para realzar pictografías y arte rupestre
                        usando decorrelación de colores.
                    </p>
                </div>

                {/* Offline feature */}
                <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-2xl p-4 flex gap-3 items-start">
                    <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-xl shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.121a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.788m13.788 0c3.808 3.808 3.808 9.98 0 13.788M12 12h.008v.008H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white">Funciona sin internet</h3>
                        <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                            El procesamiento DStretch corre <strong>en tu dispositivo</strong>. Una vez instalada,
                            puedes usar la app en campo, sin conexión. Las subidas a Drive se sincronizan
                            cuando vuelvas a tener señal.
                        </p>
                    </div>
                </div>

                {/* Install */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex gap-3 items-start">
                        <div className="bg-blue-500/20 text-blue-400 p-2 rounded-xl shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-white">Instala la app</h3>
                            <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                                {installed
                                    ? 'Ya está instalada en tu dispositivo. ✓'
                                    : ios
                                        ? 'En Safari, toca Compartir ⬆️ y luego "Añadir a pantalla de inicio".'
                                        : 'Acceso rápido desde el inicio, sin barra del navegador, modo pantalla completa.'}
                            </p>
                        </div>
                    </div>
                    {!installed && !ios && (
                        <button
                            onClick={handleInstall}
                            disabled={!bipEvent || installing}
                            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {installing ? 'Instalando…' : bipEvent ? 'Instalar ahora' : 'No disponible en este navegador'}
                        </button>
                    )}
                </div>

                {/* Two choices */}
                <div className="flex flex-col gap-2 mt-1">
                    <p className="text-xs text-slate-400 text-center mb-1">
                        ¿Cómo quieres empezar?
                    </p>
                    <button
                        onClick={onStartTutorial}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-bold py-3.5 rounded-xl transition-colors uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.5M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.5h.01" />
                        </svg>
                        Ver tutorial
                    </button>
                    <button
                        onClick={onSkipTutorial}
                        className="w-full bg-slate-800 hover:bg-slate-700 active:bg-slate-700 text-slate-200 text-sm font-bold py-3.5 rounded-xl transition-colors uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-700"
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
