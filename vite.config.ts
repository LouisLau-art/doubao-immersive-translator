import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin' 
import manifest from './src/manifest.config.js'

export default defineConfig({
  plugins: [
    crx({ manifest }),
    react(),
  ],
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        translator: 'src/translator/index.html',
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@utils': '/src/utils',
      '@types': '/src/types',
    },
  },
})