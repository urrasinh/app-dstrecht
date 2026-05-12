import { useCallback, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { enqueueUpload, listQueue, syncQueue, type QueuedUpload } from '../utils/uploadQueue';

export function useUploadSync(onSyncFail?: (msg: string) => void) {
    const [pending, setPending] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [online, setOnline] = useState(navigator.onLine);
    const [lastError, setLastError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        const items = await listQueue();
        setPending(items.length);
    }, []);

    const sync = useCallback(async () => {
        if (syncing) return;
        if (!auth.currentUser) return;
        setSyncing(true);
        try {
            const result = await syncQueue(async () => auth.currentUser ? auth.currentUser.getIdToken() : null);
            if (result.failed > 0 && result.lastError) {
                setLastError(result.lastError);
                onSyncFail?.(result.lastError);
            } else if (result.sent > 0) {
                setLastError(null);
            }
        } finally {
            setSyncing(false);
            await refresh();
        }
    }, [syncing, refresh, onSyncFail]);

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

    return { pending, syncing, online, queue, sync, lastError };
}
