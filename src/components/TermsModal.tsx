import React from 'react';

export const TermsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-tierra-900 border border-tierra-700 rounded-2xl max-w-md w-full max-h-[85dvh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-tierra-800 shrink-0">
                    <h2 className="text-base font-bold text-white">Términos y condiciones</h2>
                    <button onClick={onClose} className="text-crema-400 hover:text-white p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="overflow-y-auto px-5 py-4 text-sm text-crema-300 leading-relaxed space-y-4">
                    <p>
                        Al iniciar sesión y utilizar <strong className="text-white">Filtros Pictografías</strong> aceptas
                        los términos de uso de la plataforma y el tratamiento de datos descritos a continuación.
                    </p>

                    <section className="space-y-1.5">
                        <h3 className="text-ocre-400 text-xs font-bold uppercase tracking-wider">Uso de datos</h3>
                        <p>
                            La aplicación recolecta las imágenes que subas junto con sus metadatos asociados
                            (coordenadas geográficas, modelo de cámara, fecha de captura y correo del usuario).
                            Esta información se almacena de forma centralizada con el único propósito de construir
                            un repositorio documental.
                        </p>
                    </section>

                    <section className="space-y-1.5">
                        <h3 className="text-ocre-400 text-xs font-bold uppercase tracking-wider">Integridad y seguridad</h3>
                        <p>
                            Nos comprometemos a preservar la integridad de los datos recolectados y a operar dentro
                            de un entorno seguro. La transmisión se realiza por canales cifrados y el almacenamiento
                            se gestiona en infraestructura administrada por la entidad responsable.
                        </p>
                    </section>

                    <section className="space-y-1.5">
                        <h3 className="text-ocre-400 text-xs font-bold uppercase tracking-wider">Finalidad</h3>
                        <p>
                            La recolección se hace con el fin de constituir un repositorio que aporte al
                            <strong className="text-white"> resguardo, protección y puesta en valor del patrimonio</strong>.
                            La información recopilada se utilizará exclusivamente en favor de la documentación,
                            estudio y conservación de manifestaciones patrimoniales.
                        </p>
                    </section>

                    <section className="space-y-1.5">
                        <h3 className="text-ocre-400 text-xs font-bold uppercase tracking-wider">Responsabilidad del usuario</h3>
                        <p>
                            Al subir contenido declaras tener los derechos o autorizaciones necesarias para hacerlo
                            y entiendes que la información se incorporará al repositorio bajo los términos aquí descritos.
                        </p>
                    </section>

                    <p className="text-xs text-tierra-500 pt-2 border-t border-tierra-800">
                        El uso continuado de la aplicación implica la aceptación de estas condiciones.
                    </p>
                </div>

                <div className="px-5 py-3 border-t border-tierra-800 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full bg-ocre-600 hover:bg-ocre-500 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};
