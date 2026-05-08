// Background push handler for FCM — runs even when the PWA is closed.
// IMPORTANT: this file must be at the site root (/firebase-messaging-sw.js).
// Replace the firebaseConfig values below with the same ones from .env (VITE_FIREBASE_*).

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: 'REPLACE_API_KEY',
    authDomain: 'REPLACE_AUTH_DOMAIN',
    projectId: 'REPLACE_PROJECT_ID',
    storageBucket: 'REPLACE_STORAGE_BUCKET',
    messagingSenderId: 'REPLACE_MESSAGING_SENDER_ID',
    appId: 'REPLACE_APP_ID'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
    const title = (payload.notification && payload.notification.title) || 'Filtro Pictografías';
    const options = {
        body: (payload.notification && payload.notification.body) || '',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        data: payload.data || {}
    };
    self.registration.showNotification(title, options);
});
