import { initUI } from './ui.js';

// Initialize the application
initUI();

// Register Service Worker for offline PWA support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then((reg: ServiceWorkerRegistration) => console.log('Service Worker registered successfully', reg.scope))
            .catch((err: any) => console.error('Service Worker registration failed:', err));
    });
}
