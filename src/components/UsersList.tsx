import React, { useEffect, useState } from 'react';
import { listUsers, type AdminUser } from '../utils/adminApi';

export const UsersList: React.FC = () => {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            const r = await listUsers();
            setUsers(r.users);
        } catch (e: any) {
            setError(e.message || String(e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    if (loading) return <div className="flex-1 flex items-center justify-center text-crema-400 text-sm">Cargando usuarios…</div>;
    if (error) return <div className="flex-1 flex flex-col items-center justify-center text-burdeo-500 text-sm gap-2 px-6 text-center">
        <p>{error}</p>
        <button onClick={refresh} className="text-xs px-3 py-1.5 bg-tierra-800 rounded-lg">Reintentar</button>
    </div>;

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-tierra-950 overflow-hidden">
            <div className="shrink-0 px-4 py-2.5 border-b border-tierra-800 flex items-center justify-between bg-tierra-900/60">
                <div className="text-xs text-crema-400">{users.length} usuario(s)</div>
                <button onClick={refresh} className="text-[11px] text-crema-400 hover:text-ocre-400 px-2 py-1.5">↻</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
                {users.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-tierra-500 text-sm">Sin registros aún</div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {users.map(u => (
                            <div key={u.email} className="bg-tierra-900 border border-tierra-800 rounded-xl p-3 flex flex-col gap-1.5">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${u.isAdmin ? 'bg-ocre-600/30 text-ocre-300 border border-ocre-500/40' : 'bg-tierra-700 text-crema-300'}`}>
                                            {u.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-semibold text-white truncate">{u.email}</div>
                                            <div className="text-[10px] text-crema-400 mt-0.5">
                                                {u.isAdmin && <span className="text-ocre-400 font-bold mr-2">ADMIN</span>}
                                                {u.uploads} subida{u.uploads !== 1 ? 's' : ''}
                                                {u.withGps > 0 && <span className="ml-2 text-ocre-400">📍 {u.withGps}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-2xl font-bold text-ocre-400">{u.uploads}</div>
                                    </div>
                                </div>
                                <div className="border-t border-tierra-800/60 pt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-crema-400">
                                    <div><span className="text-tierra-500">Primera:</span> {new Date(u.firstUpload).toLocaleDateString()}</div>
                                    <div><span className="text-tierra-500">Última:</span> {new Date(u.lastUpload).toLocaleDateString()}</div>
                                    {u.cameras && (
                                        <div className="col-span-2 mt-0.5">
                                            <span className="text-tierra-500">Cámaras: </span>
                                            <span className="text-crema-300">{u.cameras}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
