import React, { useEffect, useState, useCallback } from 'react';
import { listRecords, deleteRecords, featureRecords, unfeatureRecords, driveThumb, type AdminRecord } from '../utils/adminApi';

export const Feed: React.FC = () => {
    const [records, setRecords] = useState<AdminRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const r = await listRecords();
            const sorted = [...r.records].sort((a, b) => {
                if (a.featured !== b.featured) return a.featured ? -1 : 1;
                return b.registeredAt.localeCompare(a.registeredAt);
            });
            setRecords(sorted);
        } catch (e: any) {
            setError(e.message || String(e));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const clearSelection = () => setSelected(new Set());

    const onDelete = async () => {
        if (selected.size === 0) return;
        setBusy(true);
        try {
            await deleteRecords([...selected]);
            clearSelection();
            setConfirmDelete(false);
            await refresh();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const onFeature = async (value: boolean) => {
        if (selected.size === 0) return;
        setBusy(true);
        try {
            const ids = [...selected];
            if (value) await featureRecords(ids);
            else await unfeatureRecords(ids);
            clearSelection();
            await refresh();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Cargando feed…</div>;
    if (error) return <div className="flex-1 flex flex-col items-center justify-center text-red-400 text-sm gap-2 px-6 text-center">
        <p>{error}</p>
        <button onClick={refresh} className="text-xs px-3 py-1.5 bg-slate-800 rounded-lg">Reintentar</button>
    </div>;

    const hasSelection = selected.size > 0;
    const allSelectedAreFeatured = hasSelection && [...selected].every(id => records.find(r => r.fileId === id)?.featured);

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-slate-950 overflow-hidden">
            {/* Toolbar */}
            <div className="shrink-0 px-4 py-2.5 border-b border-slate-800 flex items-center gap-2 bg-slate-900/60">
                <div className="text-xs text-slate-400 flex-1">
                    {hasSelection ? `${selected.size} seleccionada(s)` : `${records.length} imagen(es)`}
                </div>
                {hasSelection && (
                    <>
                        <button
                            onClick={() => onFeature(!allSelectedAreFeatured)}
                            disabled={busy}
                            className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 flex items-center gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                            {allSelectedAreFeatured ? 'Quitar destacado' : 'Destacar'}
                        </button>
                        <button
                            onClick={() => setConfirmDelete(true)}
                            disabled={busy}
                            className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 flex items-center gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" /></svg>
                            Eliminar
                        </button>
                        <button onClick={clearSelection} className="text-[11px] text-slate-400 hover:text-white px-2">×</button>
                    </>
                )}
                {!hasSelection && (
                    <button onClick={refresh} className="text-[11px] text-slate-400 hover:text-emerald-400 px-2 py-1.5 rounded-lg">↻</button>
                )}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-3">
                {records.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm">No hay imágenes registradas</div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {records.map(r => {
                            const sel = selected.has(r.fileId);
                            return (
                                <div
                                    key={r.fileId}
                                    onClick={() => toggle(r.fileId)}
                                    className={`relative aspect-square rounded-xl overflow-hidden bg-slate-800 border-2 cursor-pointer transition-all ${sel ? 'border-emerald-500 scale-95' : 'border-transparent hover:border-slate-600'}`}
                                >
                                    <img
                                        src={driveThumb(r.fileId, 400)}
                                        alt=""
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                    {r.featured && (
                                        <div className="absolute top-1.5 left-1.5 bg-amber-500 text-white p-1 rounded-md shadow-lg">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                        </div>
                                    )}
                                    {sel && (
                                        <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center">
                                            <div className="bg-emerald-500 text-white rounded-full p-1.5 shadow-xl">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                        </div>
                                    )}
                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-2 text-[10px] text-white">
                                        <div className="truncate font-semibold">{r.userEmail}</div>
                                        <div className="flex items-center gap-2 text-[9px] text-slate-300 mt-0.5">
                                            {r.lat != null && r.lon != null && (
                                                <a
                                                    href={r.mapsLink}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-emerald-400 hover:underline"
                                                >📍 GPS</a>
                                            )}
                                            <span>{new Date(r.registeredAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Confirm delete modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setConfirmDelete(false)}>
                    <div className="bg-slate-900 border border-red-900/60 rounded-2xl max-w-sm w-full p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-bold text-white">Eliminar {selected.size} imagen(es)</h3>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            Esta acción enviará a la papelera de Drive las imágenes seleccionadas y removerá las filas del Sheet. Las imágenes pueden recuperarse desde la papelera de Drive en los próximos 30 días.
                        </p>
                        <div className="flex gap-2 mt-4">
                            <button disabled={busy} onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-lg bg-slate-800 text-slate-300 text-sm font-semibold disabled:opacity-50">Cancelar</button>
                            <button disabled={busy} onClick={onDelete} className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold disabled:opacity-50">{busy ? 'Eliminando…' : 'Eliminar'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
