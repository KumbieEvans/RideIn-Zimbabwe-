
// Safety: Shim process.env for browser environments immediately
(window as any).process = (window as any).process || { env: {} };
(window as any).process.env = (window as any).process.env || {};

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * NUCLEAR SCRUBBER: Recursively removes all 'email' related keys.
 * Explicitly targets 'reference-email' which causes backend errors.
 */
function deepScrub(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepScrub);
  
  const clean: any = {};
  const blacklist = ['email', 'user_email', 'mail', 'e-mail', 'reference-email', 'reference_email'];
  
  for (const key in obj) {
    const k = key.toLowerCase();
    if (blacklist.some(forbidden => k === forbidden || k.includes('reference-email'))) {
      continue;
    }
    clean[key] = deepScrub(obj[key]);
  }
  return clean;
}

/**
 * STRENGTHENED FETCH FIREWALL
 * Intercepts requests with strict content-type awareness.
 */
const originalFetch = window.fetch;
window.fetch = async function(resource: string | Request | URL, config?: RequestInit) {
  let urlString = "";
  let currentConfig: RequestInit = config ? { ...config } : {};

  try {
    if (resource instanceof Request) {
      const clonedReq = resource.clone();
      urlString = clonedReq.url;
      const reqHeaders = new Headers(clonedReq.headers);
      if (currentConfig.headers) {
        new Headers(currentConfig.headers).forEach((v, k) => reqHeaders.set(k, v));
      }
      currentConfig.headers = reqHeaders;
      currentConfig.method = clonedReq.method;
    } else {
      urlString = resource.toString();
    }

    // 1. Scrub Query Parameters
    if (urlString.toLowerCase().includes('email')) {
      try {
        const urlObj = new URL(urlString, window.location.origin);
        const params = new URLSearchParams(urlObj.search);
        let changed = false;
        ['email', 'user_email', 'mail', 'e-mail', 'reference-email', 'reference_email'].forEach(key => {
          if (params.has(key)) { params.delete(key); changed = true; }
        });
        if (changed) { urlObj.search = params.toString(); urlString = urlObj.toString(); }
      } catch (e) {}
    }

    // 2. Scrub Body (JSON Only)
    const isJson = (currentConfig.headers instanceof Headers 
      ? currentConfig.headers.get('Content-Type') 
      : (currentConfig.headers as any)?.['Content-Type'])?.includes('application/json');

    if (isJson && typeof currentConfig.body === 'string') {
      try {
        const parsed = JSON.parse(currentConfig.body);
        currentConfig.body = JSON.stringify(deepScrub(parsed));
      } catch (e) {}
    }

    // 3. Scrub Headers
    if (currentConfig.headers) {
      const headers = new Headers(currentConfig.headers);
      ['X-User-Email', 'X-Email', 'reference-email', 'reference_email'].forEach(h => headers.delete(h));
      currentConfig.headers = headers;
    }

    return await originalFetch(resource instanceof Request ? resource : urlString, currentConfig);
  } catch (err: any) {
    return originalFetch(resource, config);
  }
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
