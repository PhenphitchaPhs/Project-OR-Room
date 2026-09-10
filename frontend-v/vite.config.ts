import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {

  const env = loadEnv(mode, process.cwd(), '')

  const apiTarget = env.VITE_API_PROXY_TARGET || 'https://or-room-backend.rockzee2018.workers.dev'
  console.log(`[vite] /api จะถูก proxy ไปที่ ${apiTarget}`)

  return {
    plugins: [
      vue(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },

    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },

    build: {
      // pdfkit is intentionally large; it is loaded only when exporting PDF.
      chunkSizeWarningLimit: 1500,
    },
  }
})
