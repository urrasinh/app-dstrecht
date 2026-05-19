import React, { useEffect, useState } from 'react';
import { requestPushToken } from '../firebase';
import { registerPushToken } from '../utils/adminApi';

type PermState = 'default' | 'granted' | 'denied' | 'unsupported';

const DISMISS_KEY = 'push-banner-dismissed-at';
const COOLDOWN_MS = 1000 * 60 * 60 * 24; // 1 day

export const PushPermissionBanner: React.FC = () => {
    const [perm, setPerm] = useState<PermState>('unsupported');
    const [busy, setBusy] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (typeof Notification === 'undefined') return;
        setPerm(Notification.permission as PermState);
        const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
        if (Date.now() - dismissedAt < COOLDOWN_MS) setDismissed(true);
    }, []);

    if (perm === 'unsupported' || perm === 'granted') return null;
    if (dismissed) return null;

    const onActivate = async () => {
        setBusy(true);
        try {
            const token = await requestPushToken();
            if (token) {
                await registerPushToken(token);
                setPerm('granted');
            } else {
                setPerm(Notification.permission as PermState);
            }
        } catch (e) {
            console.warn('push activation failed', e);
        } finally {
            setBusy(false);
        }
    };

    const onDismiss = () => {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setDismissed(true);
    };

    if (perm === 'denied') {
        return (
            <div className="shrink-0 bg-ocre-900/40 border-b border-ocre-800/50 px-4 py-2.5 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-ocre-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-ocre-200">Notificaciones bloqueadas</div>
                    <div className="text-[10px] text-ocre-100/80 leading-tight mt-0.5">
                        Para reactivarlas: candado 🔒 en la barra de direcciones → Permisos → Notificaciones → Permitir.
                    </div>
                </div>
                <button onClick={onDismiss} className="text-ocre-300 hover:text-ocre-100 text-lg leading-none px-1 shrink-0">×</button>
            </div>
        );
    }

    return (
        <div className="shrink-0 bg-ocre-900/40 border-b border-ocre-900/50 px-4 py-2.5 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-ocre-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-ocre-300">Activa las notificaciones</div>
                <div className="text-[10px] text-ocre-200/80 leading-tight mt-0.5">
                    Recibe alertas inmediatas cuando un usuario suba una nueva imagen.
                </div>
            </div>
            <button
                onClick={onActivate}
                disabled={busy}
                className="bg-ocre-600 hover:bg-ocre-500 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg disabled:opacity-50 shrink-0"
            >
                {busy ? '...' : 'Activar'}
            </button>
            <button onClick={onDismiss} className="text-ocre-400 hover:text-ocre-200 text-lg leading-none px-1 shrink-0">×</button>
        </div>
    );
};
