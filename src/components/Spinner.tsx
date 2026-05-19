export const Spinner: React.FC<{ progress: number; message: string }> = ({ progress, message }) => (
    <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center backdrop-blur-sm text-center p-5">
        <img src="/paqarina-vertical.png" alt="Paqarina" className="mb-5 h-32 object-contain" />
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-burdeo-600 mb-5"></div>
        <p className="text-sm font-bold text-crema-100 tracking-widest">{message}</p>
        <p className="text-burdeo-500 text-[18px] mt-2 font-mono font-bold">{progress}%</p>
        <p className="text-[11px] text-crema-400 mt-2 max-w-[250px] leading-relaxed">
            No cierres la ventana, esto puede tardar varios segundos dependiendo del tamaño de la foto.
        </p>
    </div>
);
