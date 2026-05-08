import React, { useEffect, useState } from 'react';

interface BIPEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'install-prompt-dismissed-at';
const COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export const InstallPrompt: React.FC = () => {
    const [event, setEvent] = useState<BIPEvent | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
            if (Date.now() - dismissedAt < COOLDOWN_MS) return;
            setEvent(e as BIPEvent);
            setVisible(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    if (!visible || !event) return null;

    const onInstall = async () => {
        await event.prompt();
        await event.userChoice;
        setVisible(false);
    };

    const onDismiss = () => {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setVisible(false);
    };

    return (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[150] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 flex gap-3 items-start animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-xl shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white">Instala la app</h3>
                <p className="text-xs text-slate-400 mt-0.5">Úsala como app nativa, sin barra del navegador.</p>
                <div className="flex gap-2 mt-3">
                    <button onClick={onInstall} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 rounded-lg">
                        Instalar
                    </button>
                    <button onClick={onDismiss} className="px-3 text-xs text-slate-400 hover:text-slate-200">
                        Después
                    </button>
                </div>
            </div>
        </div>
    );
};
