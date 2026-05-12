import { openDB, type IDBPDatabase } from 'idb';

export interface QueuedUpload {
    id: string;
    userEmail: string;
    fileName: string;
    mimeType: string;
    fileBlob: Blob;
    lat: number | null;
    lon: number | null;
    camera: string;
    captureDate: string;
    createdAt: number;
    attempts: number;
    lastError?: string;
}

const DB_NAME = 'dstretch-uploads';
const STORE = 'queue';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE, { keyPath: 'id' });
                }
            },
        });
    }
    return dbPromise;
}

export async function enqueueUpload(item: Omit<QueuedUpload, 'id' | 'createdAt' | 'attempts'>): Promise<QueuedUpload> {
    const db = await getDB();
    const full: QueuedUpload = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        attempts: 0,
    };
    await db.put(STORE, full);
    return full;
}

export async function listQueue(): Promise<QueuedUpload[]> {
    const db = await getDB();
    return db.getAll(STORE);
}

export async function removeFromQueue(id: string) {
    const db = await getDB();
    await db.delete(STORE, id);
}

export async function updateQueueItem(item: QueuedUpload) {
    const db = await getDB();
    await db.put(STORE, item);
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string;

async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            resolve(dataUrl.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function postUpload(item: QueuedUpload, idToken: string): Promise<{ driveLink: string }> {
    if (!BACKEND_URL) throw new Error('VITE_BACKEND_URL no configurada');
    const base64 = await blobToBase64(item.fileBlob);

    const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
            idToken,
            userEmail: item.userEmail,
            fileName: item.fileName,
            mimeType: item.mimeType,
            fileBase64: base64,
            lat: item.lat,
            lon: item.lon,
            camera: item.camera,
            captureDate: item.captureDate,
        }),
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${txt ? ' — ' + txt.slice(0, 120) : ''}`);
    }
    let json: any;
    try {
        json = await res.json();
    } catch {
        throw new Error('Backend devolvió respuesta no-JSON (¿despliegue desactualizado?)');
    }
    if (!json.ok) throw new Error(json.error || 'Backend error');
    return { driveLink: json.driveLink };
}

export type SyncResult = {
    pending: number;
    sent: number;
    failed: number;
    lastError?: string;
};

export async function syncQueue(getIdToken: () => Promise<string | null>): Promise<SyncResult> {
    const items = await listQueue();
    if (items.length === 0) return { pending: 0, sent: 0, failed: 0 };
    if (!navigator.onLine) return { pending: items.length, sent: 0, failed: 0, lastError: 'Sin conexión' };

    const idToken = await getIdToken();
    if (!idToken) return { pending: items.length, sent: 0, failed: 0, lastError: 'Sin token de auth' };

    let sent = 0;
    let failed = 0;
    let lastError: string | undefined;

    for (const item of items) {
        try {
            await postUpload(item, idToken);
            await removeFromQueue(item.id);
            sent++;
        } catch (err: any) {
            item.attempts++;
            item.lastError = err.message || String(err);
            lastError = item.lastError;
            await updateQueueItem(item);
            failed++;
        }
    }

    return { pending: failed, sent, failed, lastError };
}
