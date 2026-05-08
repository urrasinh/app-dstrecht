import { initializeApp } from 'firebase/app';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
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

export async function loginWithEmail(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
}

export async function logout() {
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
