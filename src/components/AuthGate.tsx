import React, { useEffect, useState } from 'react';
import { loginWithGoogle, sendEmailLink, isEmailLink, completeEmailLinkSignIn, getPendingEmail, loginAsGuestWithEmail } from '../firebase';
import { TermsModal } from './TermsModal';

type View = 'idle' | 'sent' | 'finishing-link' | 'need-email-confirm';

export const AuthGate: React.FC = () => {
    const [email, setEmail] = useState('');
    const [view, setView] = useState<View>('idle');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showTerms, setShowTerms] = useState(false);

    // Detect if user is returning via email link
    useEffect(() => {
        if (!isEmailLink()) return;
        const stored = getPendingEmail();
        if (stored) {
            setView('finishing-link');
            (async () => {
                try {
                    await completeEmailLinkSignIn(stored);
                    // onAuthStateChanged will move us out of AuthGate
                } catch (err: any) {
                    setError(translateError(err.code) || err.message || 'Error');
                    setView('idle');
                }
            })();
        } else {
            // Different device — ask the user for their email
            setView('need-email-confirm');
        }
    }, []);

    const handleGoogle = async () => {
        setBusy(true);
        setError(null);
        try {
            await loginWithGoogle();
        } catch (err: any) {
            setError(translateError(err.code) || err.message || 'Error');
        } finally {
            setBusy(false);
        }
    };

    const handleQuickEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await loginAsGuestWithEmail(email.trim());
            // onAuthStateChanged will move us out of AuthGate
        } catch (err: any) {
            setError(translateError(err.code) || err.message || 'Error');
            setBusy(false);
        }
    };

    const handleSendLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await sendEmailLink(email.trim());
            setView('sent');
        } catch (err: any) {
            setError(translateError(err.code) || err.message || 'Error');
        } finally {
            setBusy(false);
        }
    };

    const handleConfirmEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await completeEmailLinkSignIn(email.trim());
        } catch (err: any) {
            setError(translateError(err.code) || err.message || 'Error');
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-tierra-950 flex flex-col items-center justify-center p-6 overflow-y-auto">
            <div className="w-full max-w-sm flex flex-col gap-6">
                <div className="text-center">
                    <img src="/paqarina-vertical.png" alt="Paqarina" className="h-24 mx-auto mb-3 object-contain" />
                    <h1 className="text-xl font-bold text-white tracking-tight">DStretch Field Pro</h1>
                    <p className="text-xs text-crema-400 mt-1">
                        {view === 'sent' ? 'Te enviamos un enlace por correo' :
                         view === 'finishing-link' ? 'Completando inicio de sesión…' :
                         view === 'need-email-confirm' ? 'Confirma tu correo' :
                         'Inicia sesión para continuar'}
                    </p>
                </div>

                {view === 'sent' ? (
                    <div className="bg-ocre-900/40 border border-ocre-900/50 rounded-xl p-4 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-ocre-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 10-9 0m9 0v1.5a3 3 0 11-6 0V12m6 0H7.5m9 0L21 7.5M7.5 12L3 7.5M3 7.5l9 6.75 9-6.75M3 7.5h18v9a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 16.5v-9z" />
                        </svg>
                        <p className="text-sm text-white font-semibold mb-1">Revisa tu bandeja de entrada</p>
                        <p className="text-xs text-crema-400 leading-relaxed">
                            Enviamos un enlace a <strong className="text-ocre-400">{email}</strong>.
                            Tócalo desde el correo y volverás aquí logueado.
                        </p>
                        <button
                            onClick={() => { setView('idle'); setEmail(''); }}
                            className="mt-3 text-[11px] text-crema-400 hover:text-ocre-400 underline"
                        >
                            Usar otro correo
                        </button>
                    </div>
                ) : view === 'finishing-link' ? (
                    <div className="flex flex-col items-center gap-3 py-6">
                        <div className="w-8 h-8 border-2 border-tierra-700 border-t-ocre-500 rounded-full animate-spin"></div>
                        <p className="text-xs text-crema-400">Iniciando sesión…</p>
                    </div>
                ) : view === 'need-email-confirm' ? (
                    <form onSubmit={handleConfirmEmail} className="flex flex-col gap-3">
                        <p className="text-xs text-crema-400 leading-relaxed bg-tierra-900 border border-tierra-800 rounded-lg p-3">
                            Por seguridad, escribe el correo al que enviaste el enlace para confirmar tu identidad.
                        </p>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="Tu correo"
                            required
                            className="bg-tierra-900 border border-tierra-800 rounded-xl px-4 py-3 text-sm text-white placeholder-tierra-500 focus:outline-none focus:border-ocre-500 focus:ring-1 focus:ring-ocre-500"
                        />
                        {error && (
                            <div className="text-xs text-burdeo-500 bg-burdeo-950/40 border border-burdeo-900/50 rounded-lg px-3 py-2">{error}</div>
                        )}
                        <button
                            type="submit"
                            disabled={busy}
                            className="bg-ocre-600 hover:bg-ocre-500 active:bg-ocre-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
                        >
                            {busy ? '...' : 'Confirmar'}
                        </button>
                    </form>
                ) : (
                    <>
                        <button
                            onClick={handleGoogle}
                            disabled={busy}
                            className="w-full bg-white hover:bg-crema-100 text-tierra-900 font-semibold py-3 rounded-xl flex items-center justify-center gap-3 transition-colors disabled:opacity-50 shadow-lg"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continuar con Google
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-tierra-800"></div>
                            <span className="text-[10px] text-tierra-500 uppercase tracking-widest">o</span>
                            <div className="flex-1 h-px bg-tierra-800"></div>
                        </div>

                        <form onSubmit={handleQuickEntry} className="flex flex-col gap-3">
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Tu correo electrónico"
                                required
                                className="bg-tierra-900 border border-tierra-800 rounded-xl px-4 py-3 text-sm text-white placeholder-tierra-500 focus:outline-none focus:border-ocre-500 focus:ring-1 focus:ring-ocre-500"
                            />

                            {error && (
                                <div className="text-xs text-burdeo-500 bg-burdeo-950/40 border border-burdeo-900/50 rounded-lg px-3 py-2">{error}</div>
                            )}

                            <button
                                type="submit"
                                disabled={busy || !email}
                                className="bg-ocre-600 hover:bg-ocre-500 active:bg-ocre-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {busy ? '...' : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                        Entrar
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={(e) => handleSendLink(e as unknown as React.FormEvent)}
                                disabled={busy || !email}
                                className="text-[11px] text-crema-400 hover:text-ocre-400 underline underline-offset-2 disabled:opacity-50"
                            >
                                ¿Prefieres verificar tu correo? Recibe un enlace
                            </button>
                            <p className="text-[10px] text-tierra-500 text-center leading-snug">
                                Sin contraseñas, sin verificación. Tus subidas quedan etiquetadas con el correo declarado.
                            </p>
                        </form>
                    </>
                )}

                {view !== 'finishing-link' && (
                    <p className="text-[10px] text-tierra-500 text-center leading-relaxed pt-2 border-t border-tierra-800/60">
                        Al continuar aceptas los{' '}
                        <button
                            type="button"
                            onClick={() => setShowTerms(true)}
                            className="text-ocre-400 hover:text-ocre-300 underline underline-offset-2"
                        >
                            términos y condiciones
                        </button>
                        {' '}de la plataforma.
                    </p>
                )}
            </div>

            <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
        </div>
    );
};

function translateError(code?: string): string | null {
    switch (code) {
        case 'auth/invalid-email': return 'Correo inválido';
        case 'auth/invalid-action-code':
        case 'auth/expired-action-code': return 'El enlace expiró o ya fue usado. Pide uno nuevo.';
        case 'auth/popup-closed-by-user': return 'Cancelaste el inicio de sesión';
        case 'auth/network-request-failed': return 'Sin conexión a internet';
        case 'auth/missing-email': return 'Falta el correo';
        case 'auth/quota-exceeded': return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
        default: return null;
    }
}
