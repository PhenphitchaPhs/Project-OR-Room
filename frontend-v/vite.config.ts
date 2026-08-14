import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  /**
   * ⚠️ ต้องใช้ loadEnv อ่านไฟล์ .env เอง
   *    Vite ไม่ได้ยัดค่าจาก .env เข้า process.env ให้ ไฟล์ config นี้จึงอ่าน
   *    process.env.VITE_* ไม่เจอ (เป็นบั๊กที่ทำให้ proxy วิ่งไป worker ตัวจริงแทน localhost)
   *    พารามิเตอร์ตัวที่สามเป็น '' เพื่อให้อ่านทุกตัวแปร ไม่จำกัดเฉพาะที่ขึ้นต้นด้วย VITE_
   */
  const env = loadEnv(mode, process.cwd(), '')

  const apiTarget = env.VITE_API_PROXY_TARGET || 'https://or-room-backend.rockzee2018.workers.dev'
  console.log(`[vite] /api จะถูก proxy ไปที่ ${apiTarget}`)

  return {
    plugins: [
      vue(),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    /**
     * ตอน dev ให้ /api วิ่งไป backend เหมือนที่ vercel.json ทำตอน production
     * โค้ดฝั่ง frontend จึงเรียก path สั้น ๆ ('/api/bookings') ได้เหมือนกันทั้งสองที่
     * ไม่ต้องมี if แยกว่าตอนนี้เป็น dev หรือ production
     *
     * ค่าเริ่มต้นชี้ไป worker ที่ deploy แล้ว
     * ถ้าจะทดสอบกับ backend ที่รันในเครื่อง (npx wrangler dev) ให้สร้าง .env.local
     *     VITE_API_PROXY_TARGET=http://localhost:8787
     */
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
