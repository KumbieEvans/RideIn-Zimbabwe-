
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Using (process as any).cwd() to avoid TS errors in environments without Node types globally resolved.
  // Using '' to load all variables (including those injected by CI/CD platforms like Netlify).
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'RideIn Zimbabwe',
          short_name: 'RideIn',
          description: 'Zimbabwe\'s Premium Mobility App - Powered by Gemini AI',
          theme_color: '#002B5B',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
          cleanupOutdatedCaches: true,
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        }
      })
    ],
    // The 'define' block replaces literal process.env strings in source code during build.
    // We prioritize values from 'env' which merges .env files and system process.env.
    define: {
      'process.env.MAPBOX_TOKEN': JSON.stringify(env.MAPBOX_TOKEN || ''),
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.ABLY_API_KEY': JSON.stringify(env.ABLY_API_KEY || ''),
    },
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      rollupOptions: {
        output: {
          // Splitting large vendor libs into separate chunks improves caching 
          // and reduces the size of the main entry point to prevent "blank screen" timeouts.
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-mapbox': ['mapbox-gl'],
            'vendor-ably': ['ably'],
            'vendor-ai': ['@google/genai']
          }
        }
      }
    },
    server: {
      port: 3000,
      host: true
    }
  };
});
