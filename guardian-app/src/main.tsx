import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// the service worker is what makes this installable on Android and lets the
// shell open offline; iOS installs from the meta tags in index.html
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* not fatal — the app still runs, it just is not installable */
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
