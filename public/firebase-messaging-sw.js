/**
 * Firebase Cloud Messaging Service Worker
 * Handles background push notifications
 */

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration (same as in your app)
// Note: Service workers can't access Vite env variables, so we hardcode these
// These values are already public in your client-side code, so they're not secret
const firebaseConfig = {
  apiKey: "AIzaSyAO1upDeT8-oTcGlA4G_d_es9dRha1LIBs",
  authDomain: "intelligence-exchange-8281f.firebaseapp.com",
  projectId: "intelligence-exchange-8281f",
  storageBucket: "intelligence-exchange-8281f.firebasestorage.app",
  messagingSenderId: "957550637988",
  appId: "1:957550637988:web:e6d26e43ff4f9169d5c731",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging object
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'Drop Reminder';
  const notificationOptions = {
    body: payload.notification?.body || 'A drop reminder is available',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  
  event.notification.close();
  
  // Open the app when notification is clicked
  event.waitUntil(
    clients.openWindow('/drops')
  );
});

