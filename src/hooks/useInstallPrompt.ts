import { useEffect, useState } from 'react';

interface BIPEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOSSafari(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) || (navigator.maxTouchPoints > 1 && /Mac/.test(ua));
}

function isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(display-mode: standalone)').matches ||
        (navigator as { standalone?: boolean }).standalone === true;
}

/**
 * Shared install-prompt hook used by both FirstTimeWelcome and the
 * "Instalar la app" item in the kebab menu.
 *
 * Returns:
 *  - canInstallNative: true on Android/Chrome when we've captured the
 *    `beforeinstallprompt` event and the app isn't installed yet.
 *  - isIOS: true on iOS Safari when the app isn't installed yet.
 *  - installed: true if running in standalone display-mode (already on home screen).
 *  - promptInstall(): Android/Chrome path — triggers the native prompt.
 */
export function useInstallPrompt() {
    const [bipEvent, setBipEvent] = useState<BIPEvent | null>(null);
    const [installed, setInstalled] = useState<boolean>(() => isStandalone());

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setBipEvent(e as BIPEvent);
        };
        const onInstalled = () => {
            setInstalled(true);
            setBipEvent(null);
        };
        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    const promptInstall = async (): Promise<boolean> => {
        if (!bipEvent) return false;
        await bipEvent.prompt();
        const { outcome } = await bipEvent.userChoice;
        if (outcome === 'accepted') {
            setInstalled(true);
            setBipEvent(null);
            return true;
        }
        return false;
    };

    const ios = isIOSSafari();

    return {
        canInstallNative: !!bipEvent && !installed,
        isIOS: ios && !installed,
        installed,
        promptInstall,
    };
}
