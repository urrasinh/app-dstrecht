import { auth } from '../firebase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string;

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
    if (!BACKEND_URL) throw new Error('VITE_BACKEND_URL no configurada');
    const u = auth.currentUser;
    if (!u) throw new Error('No hay sesión');
    const idToken = await u.getIdToken();
    const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, idToken, ...payload }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Backend error');
    return json as T;
}

export interface AdminRecord {
    registeredAt: string;
    userEmail: string;
    imageLink: string;
    lat: number | null;
    lon: number | null;
    mapsLink: string;
    camera: string;
    captureDate: string;
    featured: boolean;
    fileId: string;
}

export interface AdminUser {
    email: string;
    uploads: number;
    firstUpload: string;
    lastUpload: string;
    cameras: string;
    withGps: number;
    isAdmin: boolean;
}

export const whoami = () => call<{ ok: true; email: string; isAdmin: boolean }>('whoami');
export const listRecords = () => call<{ ok: true; records: AdminRecord[] }>('list');
export const deleteRecords = (fileIds: string[]) => call<{ ok: true; deleted: number }>('delete', { fileIds });
export const featureRecords = (fileIds: string[]) => call<{ ok: true; updated: number }>('feature', { fileIds });
export const unfeatureRecords = (fileIds: string[]) => call<{ ok: true; updated: number }>('unfeature', { fileIds });
export const listUsers = () => call<{ ok: true; users: AdminUser[] }>('users');
export const registerPushToken = (token: string) => call<{ ok: true }>('registerPushToken', { token });

export function driveThumb(fileId: string, size = 400): string {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}
