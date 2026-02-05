
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
    // Block anything resembling the blacklisted keys
    if (blacklist.some(forbidden => k === forbidden || k.includes('reference-email'))) {
      console.warn(`[Interceptor] Terminated unauthorized parameter: ${key}`);
      continue;
    }
    clean[key] = deepScrub(obj[key]);
  }
  return clean;
}

/**
 * TACTICAL FETCH FIREWALL
 * Intercepts every outgoing request to ensure absolute cleanliness.
 */
const originalFetch = window.fetch;
window.fetch = async function(resource: string | Request | URL, config?: RequestInit) {
  let urlString = "";
  let currentConfig: RequestInit = { ...(config || {}) };

  try {
    if (resource instanceof Request) {
      // CLONE THE REQUEST to avoid "Body has been used" errors
      const clonedReq = resource.clone();
      urlString = clonedReq.url;
      
      const reqHeaders = new Headers(clonedReq.headers);
      if (currentConfig.headers) {
        const configHeaders = new Headers(currentConfig.headers);
        configHeaders.forEach((v, k) => reqHeaders.set(k, v));
      }
      currentConfig.headers = reqHeaders;
      currentConfig.method = clonedReq.method;
    } else {
      urlString = resource.toString();
    }

    // 1. Scrub Query Parameters from URL
    if (urlString.toLowerCase().includes('email')) {
      try {
        const urlObj = new URL(urlString, window.location.origin);
        const params = new URLSearchParams(urlObj.search);
        let changed = false;
        const forbidden = ['email', 'user_email', 'mail', 'e-mail', 'reference-email', 'reference_email'];
        
        forbidden.forEach(key => {
          if (params.has(key)) {
            params.delete(key);
            changed = true;
          }
        });

        if (changed) {
          urlObj.search = params.toString();
          urlString = urlObj.toString();
        }
      } catch (e) {
        urlString = urlString.replace(/([?&])email=[^&]*/gi, '');
      }
    }

    // 2. Scrub Body (Only if JSON string)
    if (currentConfig.body && typeof currentConfig.body === 'string') {
      try {
        const parsed = JSON.parse(currentConfig.body);
        const scrubbed = deepScrub(parsed);
        currentConfig.body = JSON.stringify(scrubbed);
      } catch (e) {
        // Not JSON, leave as is
      }
    }

    // 3. Scrub Headers
    if (currentConfig.headers) {
      const headers = new Headers(currentConfig.headers);
      headers.delete('X-User-Email');
      headers.delete('X-Email');
      headers.delete('reference-email');
      headers.delete('reference_email');
      currentConfig.headers = headers;
    }

    return await originalFetch(urlString || resource, currentConfig);
  } catch (err: any) {
    console.error('[Interceptor Critical Error]', err);
    // On failure, attempt one last standard fetch without interception logic
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
