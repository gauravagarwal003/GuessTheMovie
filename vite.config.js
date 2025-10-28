// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/', // Change to '/GuessTheMovie/' if not using custom domain
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
