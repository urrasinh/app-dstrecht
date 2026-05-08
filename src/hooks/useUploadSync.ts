import { useCallback, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { enqueueUpload, listQueue, syncQueue, type QueuedUpload } from '../utils/uploadQueue';

export function useUploadSync() {
    const [pending, setPending] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [online, setOnline] = useState(navigator.onLine);

    const refresh = useCallback(async () => {
        const items = await listQueue();
        setPending(items.length);
    }, []);

    const sync = useCallback(async () => {
        if (syncing) return;
        if (!auth.currentUser) return;
        setSyncing(true);
        try {
            await syncQueue(async () => auth.currentUser ? auth.currentUser.getIdToken() : null);
        } finally {
            setSyncing(false);
            await refresh();
        }
    }, [syncing, refresh]);

    const queue = useCallback(async (item: Omit<QueuedUpload, 'id' | 'createdAt' | 'attempts'>) => {
        await enqueueUpload(item);
        await refresh();
        if (navigator.onLine) sync();
    }, [refresh, sync]);

    useEffect(() => {
        refresh();
        const onOnline = () => { setOnline(true); sync(); };
        const onOffline = () => setOnline(false);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, [refresh, sync]);

    return { pending, syncing, online, queue, sync };
}
