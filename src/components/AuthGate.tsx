import React, { useState } from 'react';
import { loginWithEmail, loginWithGoogle, registerWithEmail } from '../firebase';
import { TermsModal } from './TermsModal';

type Mode = 'login' | 'register';

export const AuthGate: React.FC = () => {
    const [mode, setMode] = useState<Mode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showTerms, setShowTerms] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            if (mode === 'login') await loginWithEmail(email, password);
            else await registerWithEmail(email, password);
        } catch (err: any) {
            setError(translateError(err.code) || err.message || 'Error');
        } finally {
            setBusy(false);
        }
    };

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

    return (
        <div className="fixed inset-0 z-[300] bg-slate-950 flex flex-col items-center justify-center p-6 overflow-y-auto">
            <div className="w-full max-w-sm flex flex-col gap-6">
                <div className="text-center">
                    <img src="/collasuyo.svg" alt="Logo" className="h-14 mx-auto mb-3" />
                    <h1 className="text-xl font-bold text-white tracking-tight">DStretch Field Pro</h1>
                    <p className="text-xs text-slate-400 mt-1">
                        {mode === 'login' ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}
                    </p>
                </div>

                <button
                    onClick={handleGoogle}
                    disabled={busy}
                    className="w-full bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3 rounded-xl flex items-center justify-center gap-3 transition-colors disabled:opacity-50 shadow-lg"
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
                    <div className="flex-1 h-px bg-slate-800"></div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">o</span>
                    <div className="flex-1 h-px bg-slate-800"></div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Correo electrónico"
                        required
                        className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Contraseña (mín. 6 caracteres)"
                        required
                        minLength={6}
                        className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />

                    {error && (
                        <div className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={busy}
                        className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
                    >
                        {busy ? '...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                    </button>
                </form>

                <button
                    type="button"
                    onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                    className="text-xs text-slate-400 hover:text-emerald-400 text-center"
                >
                    {mode === 'login' ? '¿No tienes cuenta? Crear una' : '¿Ya tienes cuenta? Iniciar sesión'}
                </button>

                <p className="text-[10px] text-slate-500 text-center leading-relaxed pt-2 border-t border-slate-800/60">
                    Al continuar aceptas los{' '}
                    <button
                        type="button"
                        onClick={() => setShowTerms(true)}
                        className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                    >
                        términos y condiciones
                    </button>
                    {' '}de la plataforma.
                </p>
            </div>

            <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
        </div>
    );
};

function translateError(code?: string): string | null {
    switch (code) {
        case 'auth/invalid-email': return 'Correo inválido';
        case 'auth/missing-password':
        case 'auth/weak-password': return 'Contraseña débil (mín. 6 caracteres)';
        case 'auth/email-already-in-use': return 'Este correo ya está registrado';
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found': return 'Correo o contraseña incorrectos';
        case 'auth/popup-closed-by-user': return 'Cancelaste el inicio de sesión';
        case 'auth/network-request-failed': return 'Sin conexión a internet';
        default: return null;
    }
}
