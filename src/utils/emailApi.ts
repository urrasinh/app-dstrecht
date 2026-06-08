import { auth } from '../firebase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string;

export interface EmailImageOpts {
    fileBase64: string;
    fileName: string;
    mimeType: string;
    toEmail: string;
}

/**
 * Emails the processed image to the given address via the Apps Script backend
 * (action: emailImage). Requires the user to be signed in (sends a Firebase
 * ID token for verification). Throws with a human-readable message on failure.
 */
export async function sendImageEmail(opts: EmailImageOpts): Promise<void> {
    if (!BACKEND_URL) throw new Error('Backend no configurado');
    const user = auth.currentUser;
    if (!user) throw new Error('Sesión no iniciada');

    const idToken = await user.getIdToken();
    const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
            action: 'emailImage',
            idToken,
            userEmail: opts.toEmail,
            toEmail: opts.toEmail,
            fileBase64: opts.fileBase64,
            fileName: opts.fileName,
            mimeType: opts.mimeType,
        }),
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${txt ? ' — ' + txt.slice(0, 100) : ''}`);
    }
    let json: any;
    try {
        json = await res.json();
    } catch {
        throw new Error('Respuesta no-JSON del backend (¿despliegue desactualizado?)');
    }
    if (!json.ok) throw new Error(json.error || 'Error del backend');
}

// ── Preference: auto-send a copy after each download ─────────────────────────

const EMAIL_PREF_KEY = 'email-copy-pref';

export interface EmailPref {
    enabled: boolean;
    email: string;
}

export function readEmailPref(): EmailPref | null {
    try {
        const raw = localStorage.getItem(EMAIL_PREF_KEY);
        if (!raw) return null;
        const p = JSON.parse(raw);
        if (p && typeof p.email === 'string') return { enabled: !!p.enabled, email: p.email };
        return null;
    } catch {
        return null;
    }
}

export function saveEmailPref(pref: EmailPref): void {
    try {
        localStorage.setItem(EMAIL_PREF_KEY, JSON.stringify(pref));
    } catch {
        /* ignore quota errors */
    }
}

export function clearEmailPref(): void {
    try {
        localStorage.removeItem(EMAIL_PREF_KEY);
    } catch {
        /* noop */
    }
}
