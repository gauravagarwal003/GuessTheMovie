// vite.config.js
import { defineConfig } from 'vite';

// Allow overriding the base at build/dev time (useful for testing via ngrok).
// Example:
//   export VITE_BASE_URL="https://virtually-alive-cockatoo.ngrok-free.app/"
//   npm run dev
const rawBase = process.env.VITE_BASE_URL || process.env.BASE_URL || '/';
// remove trailing slash for consistent origin/hmr behavior
const base = rawBase === '/' ? '/' : String(rawBase).replace(/\/$/, '');

// NEW: helper to extract host from a full URL (returns null for relative '/')
function extractHostFromUrl(url) {
  try {
    const u = new URL(url);
    return u.host; // includes port if present
  } catch (e) {
    return null;
  }
}

// Determine default HMR settings:
// - host: explicit VITE_HMR_HOST OR host parsed from VITE_BASE_URL
// - protocol: use wss when VITE_BASE_URL is https, else ws
// - clientPort: explicit env OR 443 when using https (useful for ngrok TLS)
const inferredHost = extractHostFromUrl(rawBase) || undefined;
const hmrHost = process.env.VITE_HMR_HOST || inferredHost;
const isHttpsOrigin = String(rawBase).startsWith('https');
const hmrProtocol = isHttpsOrigin ? 'wss' : 'ws';
const hmrClientPort = process.env.VITE_HMR_CLIENT_PORT
  ? Number(process.env.VITE_HMR_CLIENT_PORT)
  : (isHttpsOrigin ? 443 : undefined);

export default defineConfig({
  base, // set from env when provided

  // NEW: allow external access to the dev server and set origin/hmr for ngrok
  server: {
    host: '0.0.0.0',                         // bind to all interfaces so ngrok can reach it
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
    origin: rawBase === '/' ? undefined : rawBase, // pass the exact origin (no trailing slash)
    hmr: {
      protocol: hmrProtocol,
      host: hmrHost,
      clientPort: hmrClientPort
    }
  },

  // NEW: dev-only plugin to rewrite pretty routes -> corresponding .html
  plugins: [
    {
      name: 'spa-pretty-route-rewrite',
      configureServer(server) {
        const routeMap = {
          'archive': '/archive.html',
          'calendar': '/calendar.html',
          'about': '/about.html',
          'history': '/history.html'
          // add more mappings here if you add more standalone pages
        };

        server.middlewares.use((req, res, next) => {
          try {
            // Ignore non-GET requests
            if (req.method && req.method.toUpperCase() !== 'GET') return next();

            // only rewrite if path matches one of our pretty routes
            const rawUrl = req.url || '';
            const pathOnly = rawUrl.split('?')[0];

            // Avoid touching requests for static files that include an extension
            if (/\.[a-zA-Z0-9]+$/.test(pathOnly)) return next();

            for (const [route, targetHtml] of Object.entries(routeMap)) {
              if (pathOnly === `/${route}` || pathOnly.startsWith(`/${route}/`)) {
                req.url = targetHtml;
                break;
              }
            }
          } catch (e) {
            // swallow errors and continue to next middleware
          }
          return next();
        });
      }
    }
  ],

  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        archive: './public/archive.html',
        calendar: './public/calendar.html',
        about: './public/about.html',
        history: './public/history.html',
        incorrect: './public/incorrect_url.html'
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
});
