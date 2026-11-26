import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        linkbio: resolve(__dirname, 'linkbio/index.html'),
        privacidade: resolve(__dirname, 'privacidade/index.html'),
        termos: resolve(__dirname, 'termos/index.html'),
        notFound: resolve(__dirname, '404.html')
      }
    }
  }
});
