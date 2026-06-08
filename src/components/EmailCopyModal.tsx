import React, { useEffect, useState } from 'react';

interface EmailCopyModalProps {
    isOpen: boolean;
    defaultEmail: string;
    busy: boolean;
    onSend: (email: string, remember: boolean) => void;
    onClose: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EmailCopyModal: React.FC<EmailCopyModalProps> = ({ isOpen, defaultEmail, busy, onSend, onClose }) => {
    const [email, setEmail] = useState(defaultEmail);
    const [remember, setRemember] = useState(false);

    // Reset the field to the account email each time the modal opens
    useEffect(() => {
        if (isOpen) {
            setEmail(defaultEmail);
            setRemember(false);
        }
    }, [isOpen, defaultEmail]);

    if (!isOpen) return null;

    const valid = EMAIL_RE.test(email.trim());

    return (
        <div className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={busy ? undefined : onClose}>
            <div
                className="bg-tierra-900 border border-tierra-700 rounded-2xl max-w-sm w-full shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-ocre-900/40 flex items-center justify-center text-ocre-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 10-9 0m9 0v1.5a3 3 0 11-6 0V12m6 0H7.5m9 0L21 7.5M7.5 12L3 7.5M3 7.5l9 6.75 9-6.75M3 7.5h18v9a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 16.5v-9z" />
                        </svg>
                    </div>
                    <h2 className="text-base font-bold text-white">Enviar copia a tu correo</h2>
                    <p className="text-xs text-crema-400 leading-relaxed">
                        Te enviaremos la imagen procesada como respaldo, además de la descarga.
                    </p>
                </div>

                <div className="px-6 py-3 flex flex-col gap-3">
                    <input
                        type="email"
                        inputMode="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        disabled={busy}
                        className="bg-tierra-950 border border-tierra-700 rounded-xl px-4 py-3 text-sm text-white placeholder-tierra-500 focus:outline-none focus:border-ocre-500 focus:ring-1 focus:ring-ocre-500 disabled:opacity-50"
                    />

                    <label className="flex items-center gap-2.5 cursor-pointer select-none px-1">
                        <input
                            type="checkbox"
                            checked={remember}
                            onChange={e => setRemember(e.target.checked)}
                            disabled={busy}
                            className="w-4 h-4 accent-burdeo-600"
                        />
                        <span className="text-xs text-crema-300">Recordar y enviar automáticamente al descargar</span>
                    </label>
                </div>

                <div className="px-6 pb-6 pt-1 flex flex-col gap-2">
                    <button
                        onClick={() => onSend(email.trim(), remember)}
                        disabled={busy || !valid}
                        className="w-full bg-burdeo-700 hover:bg-burdeo-600 active:bg-burdeo-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {busy && <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>}
                        {busy ? 'Enviando…' : 'Enviar copia'}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={busy}
                        className="w-full text-crema-400 hover:text-white text-sm font-semibold py-2 rounded-xl transition-colors disabled:opacity-50"
                    >
                        Ahora no
                    </button>
                </div>
            </div>
        </div>
    );
};
