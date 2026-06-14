// app.js (Entry Point)
import { initUI } from './ui.js';

// Initialize the application
initUI();

// Register Service Worker for offline PWA support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered successfully'))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}
