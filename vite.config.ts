/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Security headers applied to the dev + preview servers so local testing matches production
// (production hosts get the same set from public/_headers and vercel.json).
const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=(), hid=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/**
 * The production CSP forbids inline scripts, but Vite's dev server (HMR + React Refresh preamble) needs them.
 * Relax the meta CSP for `vite dev` only; builds keep the strict policy.
 */
function devCsp(): Plugin {
  return {
    name: 'wonderverse-dev-csp',
    apply: 'serve',
    transformIndexHtml(html) {
      return html
        .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
        .replace("connect-src 'self'", "connect-src 'self' ws: wss:");
    },
  };
}

export default defineConfig({
  // Relative base so the static build works from any sub-path (GitHub Pages, CDN folders, previews).
  base: './',
  plugins: [react(), devCsp()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { headers: securityHeaders },
  preview: { headers: securityHeaders },
  build: {
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        codeSplitting: {
          // Don't drag shared deps (react, zustand…) into the 3D chunks — that would force-load three.js on the home screen.
          includeDependenciesRecursively: false,
          groups: [
            // three.js is large and changes rarely: its own long-cached chunk, fetched only when a world opens.
            { name: 'three-core', test: /node_modules[\\/]three[\\/]/, priority: 30 },
            {
              name: 'r3f',
              test: /node_modules[\\/](@react-three[\\/](fiber|drei|postprocessing)|postprocessing|maath|three-stdlib|camera-controls|troika-[^\\/]+|meshline|stats-gl|@monogrid)[\\/]/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
