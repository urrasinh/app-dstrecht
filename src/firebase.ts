import { initializeApp } from 'firebase/app';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    signInAnonymously,
    updateProfile,
    signOut,
    onAuthStateChanged,
    type User,
} from 'firebase/auth';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle() {
    return signInWithPopup(auth, googleProvider);
}

const PENDING_EMAIL_KEY = 'auth-pending-email';

export async function sendEmailLink(email: string): Promise<void> {
    const url = window.location.origin + window.location.pathname;
    await sendSignInLinkToEmail(auth, email, {
        url,
        handleCodeInApp: true,
    });
    localStorage.setItem(PENDING_EMAIL_KEY, email);
}

/** Returns true if the current URL is a Firebase email-link sign-in URL. */
export function isEmailLink(url = window.location.href): boolean {
    return isSignInWithEmailLink(auth, url);
}

/**
 * Completes sign-in from an email link. If we don't have the email saved
 * (the user opened the link on a different device), pass it explicitly.
 */
export async function completeEmailLinkSignIn(email?: string): Promise<void> {
    const link = window.location.href;
    if (!isSignInWithEmailLink(auth, link)) return;
    const stored = email ?? localStorage.getItem(PENDING_EMAIL_KEY) ?? '';
    if (!stored) throw new Error('Necesitamos el correo con el que solicitaste el enlace.');
    await signInWithEmailLink(auth, stored, link);
    localStorage.removeItem(PENDING_EMAIL_KEY);
    // Clean the URL so a refresh doesn't re-trigger
    if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState({}, '', window.location.pathname);
    }
}

export function getPendingEmail(): string | null {
    return localStorage.getItem(PENDING_EMAIL_KEY);
}

const GUEST_EMAIL_KEY = 'auth-guest-email';

/**
 * Quick guest login: declare an email without verification.
 * Uses Firebase Anonymous Auth and stores the declared email as displayName.
 *
 * IMPORTANT: writes localStorage BEFORE signInAnonymously so that the first
 * onAuthStateChanged callback (where user.email=null, displayName=null) can
 * still resolve the declared email via getUserEmail(). Otherwise the welcome
 * + tutorial trigger effect bails out early.
 */
export async function loginAsGuestWithEmail(email: string): Promise<void> {
    const cleaned = email.trim();
    if (!cleaned) throw new Error('Correo requerido');
    // Persist email FIRST so onAuthStateChanged sees it
    localStorage.setItem(GUEST_EMAIL_KEY, cleaned);
    const cred = await signInAnonymously(auth);
    if (cred.user) {
        await updateProfile(cred.user, { displayName: cleaned });
    }
}

/** Returns the stable email for the user: real email (verified) or guest displayName. */
export function getUserEmail(user: User | null): string {
    if (!user) return '';
    return user.email || user.displayName || localStorage.getItem(GUEST_EMAIL_KEY) || '';
}

export function isGuestUser(user: User | null): boolean {
    return !!user && user.isAnonymous;
}

export async function logout() {
    localStorage.removeItem(GUEST_EMAIL_KEY);
    return signOut(auth);
}

export function subscribeAuth(cb: (user: User | null) => void) {
    return onAuthStateChanged(auth, cb);
}

export type { User };

// ── Push notifications (FCM) ────────────────────────────────────────────────

const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY as string | undefined;

export async function requestPushToken(): Promise<string | null> {
    try {
        if (!VAPID_KEY) return null;
        const supported = await isSupported();
        if (!supported) return null;
        if (typeof Notification === 'undefined') return null;
        if (Notification.permission === 'denied') return null;
        if (Notification.permission === 'default') {
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') return null;
        }
        const sw = await navigator.serviceWorker.ready;
        const messaging = getMessaging(firebaseApp);
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: sw });
        return token || null;
    } catch (err) {
        console.warn('FCM token request failed', err);
        return null;
    }
}

export function listenForegroundPush(cb: (title: string, body: string) => void) {
    isSupported().then(s => {
        if (!s) return;
        const messaging = getMessaging(firebaseApp);
        onMessage(messaging, payload => {
            const n = payload.notification;
            if (n) cb(n.title || 'Notificación', n.body || '');
        });
    });
}
