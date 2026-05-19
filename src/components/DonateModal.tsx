import React, { useState } from 'react';

interface DonateModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DonateModal: React.FC<DonateModalProps> = ({ isOpen, onClose }) => {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    if (!isOpen) return null;

    const copy = async (text: string, key: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 1800);
        } catch {
            // fallback
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 1800);
        }
    };

    const copyAllBank = () => {
        const text = [
            'GUILLERMO JESUS URRA BUSTAMANTE',
            'RUT: 15.461.632-2',
            'Banco: BCI / Banco Crédito e Inversiones',
            'Cuenta Vista',
            'N° 777015461632',
            'urrasinh@gmail.com',
        ].join('\n');
        copy(text, 'bank-all');
    };

    const Field: React.FC<{ label: string; value: string; keyName: string }> = ({ label, value, keyName }) => (
        <button
            onClick={() => copy(value, keyName)}
            className="group w-full text-left bg-tierra-800/60 hover:bg-tierra-800 border border-tierra-700 rounded-lg px-3 py-2 transition-colors flex items-center gap-2"
        >
            <div className="flex-1 min-w-0">
                <div className="text-[9px] font-bold text-tierra-500 uppercase tracking-widest">{label}</div>
                <div className="text-xs text-white font-mono truncate">{value}</div>
            </div>
            <div className="shrink-0">
                {copiedKey === keyName ? (
                    <div className="text-[10px] font-bold text-ocre-400 uppercase tracking-wider">Copiado ✓</div>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-crema-400 group-hover:text-ocre-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                )}
            </div>
        </button>
    );

    return (
        <div className="fixed inset-0 z-[450] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-tierra-900 border border-ocre-400/40 rounded-2xl max-w-md w-full max-h-[90dvh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 pt-5 pb-3 shrink-0 flex items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">☕</span>
                            <h2 className="text-base font-bold text-white">Regálame un café</h2>
                        </div>
                        <p className="text-xs text-crema-400 mt-2 leading-relaxed">
                            Esta app es <strong className="text-white">100% gratis</strong>. Si te ha
                            sido útil, cualquier aporte ayuda a financiar los gastos básicos del
                            proyecto: hosting, almacenamiento y desarrollo continuo. ¡Gracias!
                        </p>
                    </div>
                    <button onClick={onClose} className="text-crema-400 hover:text-white p-1 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="overflow-y-auto px-5 pb-5 flex flex-col gap-5">
                    {/* PayPal */}
                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[10px] font-bold text-ocre-300 uppercase tracking-widest flex items-center gap-2">
                                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 1.658A.776.776 0 0 1 5.71 1h7.046c2.957 0 5.003 1.96 4.61 4.93-.038.293-.085.59-.156.892C16.39 9.32 14.05 11.07 11.013 11.07H8.235c-.4 0-.74.29-.802.685l-.952 6.04-.405 2.553zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c.013.076.026.175.041.254.59 3.025-1.045 5.566-3.668 6.493-1.32.467-2.798.67-4.213.67H10.31c-.27 0-.5.197-.542.466l-1.075 6.821-.305 1.94a.498.498 0 0 0 .493.578h3.882c.42 0 .77-.305.835-.72.062-.34.46-2.917.527-3.39.054-.376.39-.66.766-.66h.485c3.072 0 5.477-1.247 6.184-4.85.295-1.508.142-2.766-.638-3.65l-.7.59z" />
                                </svg>
                                PayPal
                            </h3>
                        </div>
                        <Field label="Correo PayPal" value="urrasinh@gmail.com" keyName="paypal" />
                        <a
                            href="https://www.paypal.com/paypalme/urrasinh"
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 w-full bg-burdeo-600 hover:bg-ocre-400 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 1.658A.776.776 0 0 1 5.71 1h7.046c2.957 0 5.003 1.96 4.61 4.93-.038.293-.085.59-.156.892C16.39 9.32 14.05 11.07 11.013 11.07H8.235c-.4 0-.74.29-.802.685l-.952 6.04-.405 2.553zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c.013.076.026.175.041.254.59 3.025-1.045 5.566-3.668 6.493-1.32.467-2.798.67-4.213.67H10.31c-.27 0-.5.197-.542.466l-1.075 6.821-.305 1.94a.498.498 0 0 0 .493.578h3.882c.42 0 .77-.305.835-.72.062-.34.46-2.917.527-3.39.054-.376.39-.66.766-.66h.485c3.072 0 5.477-1.247 6.184-4.85.295-1.508.142-2.766-.638-3.65l-.7.59z" />
                            </svg>
                            Donar por PayPal
                        </a>
                    </section>

                    {/* Bank */}
                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[10px] font-bold text-ocre-400 uppercase tracking-widest flex items-center gap-2">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M5 6h14M7 18h10" />
                                </svg>
                                Transferencia bancaria (Chile)
                            </h3>
                            <button
                                onClick={copyAllBank}
                                className="text-[9px] font-bold uppercase tracking-wider text-ocre-400 hover:text-ocre-300 px-2 py-1 rounded bg-ocre-900/40 border border-ocre-900/50"
                            >
                                {copiedKey === 'bank-all' ? '✓ Copiado' : 'Copiar todo'}
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Field label="Nombre" value="GUILLERMO JESUS URRA BUSTAMANTE" keyName="name" />
                            <Field label="RUT" value="15.461.632-2" keyName="rut" />
                            <Field label="Banco" value="BCI / Banco Crédito e Inversiones" keyName="bank" />
                            <Field label="Tipo de cuenta" value="Cuenta Vista" keyName="acctype" />
                            <Field label="Número de cuenta" value="777015461632" keyName="acctnumber" />
                            <Field label="Email" value="urrasinh@gmail.com" keyName="email" />
                        </div>
                    </section>

                    <p className="text-[10px] text-tierra-500 text-center leading-relaxed pt-1">
                        Toca cualquier campo para copiarlo individualmente.
                    </p>
                </div>

                <div className="px-5 py-3 border-t border-tierra-800 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full bg-tierra-800 hover:bg-tierra-700 text-crema-300 font-semibold py-2.5 rounded-xl transition-colors text-sm"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
