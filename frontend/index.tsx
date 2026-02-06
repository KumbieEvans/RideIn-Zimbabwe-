import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = createRoot(rootElement);
    
    // Mount the application
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    // Signal successful boot to remove CSS loader
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.body.classList.add('loaded');
        console.info("[System] App ready. Connection established.");
      }, 100);
    });
    
  } catch (err) {
    console.error("[CRITICAL] App Root Mount Failure:", err);
    rootElement.innerHTML = `
      <div style="height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000814;color:white;text-align:center;padding:40px;font-family:sans-serif;">
        <div style="font-size:64px;margin-bottom:20px;">⚠️</div>
        <h1 style="color:#FF5F00;font-weight:900;text-transform:uppercase;letter-spacing:-0.05em;margin-bottom:10px;">Connection Error</h1>
        <p style="opacity:0.6;font-size:10px;max-width:320px;line-height:1.6;letter-spacing:0.1em;text-transform:uppercase;">
          The app couldn't start properly.<br>
          Error: ${err instanceof Error ? err.message : 'Something went wrong'}
        </p>
        <button onclick="window.location.reload()" style="padding:18px 36px; background:#FF5F00; border:none; color:white; border-radius:16px; margin-top:30px; font-weight:900; text-transform:uppercase; letter-spacing:0.2em; cursor:pointer;">Retry</button>
      </div>
    `;
  }
}