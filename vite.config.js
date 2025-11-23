import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin' 
import manifest from './src/manifest.config.js'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173, // 关键：强制 HMR 使用和 Server 同样的端口
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
})