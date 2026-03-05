// ไฟล์: backend/src/index.ts (หรือ server.ts)

import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// 1. เปิดประตูให้ Vue.js (Frontend) คุยกับ Hono (Backend) ได้
app.use('/*', cors())

// 2. ยามเฝ้าประตู (Middleware) เช็กสิทธิ์ Admin
const adminOnly = async (c, next) => {
  const userRole = c.req.header('X-User-Role') 
  if (userRole !== 'admin') {
    return c.json({ message: 'Access Denied! คุณไม่ใช่ Admin' }, 403)
  }
  await next() 
}

// 3. เส้นทาง (Routes) สำหรับ API ต่างๆ
app.get('/', (c) => {
  return c.text('Hello! Backend OR Room is running 🚀')
})

app.get('/api/bookings', (c) => {
  return c.json({ message: 'นี่คือข้อมูลคิวผ่าตัดทั้งหมด' })
})

app.delete('/api/bookings/:id', adminOnly, (c) => {
  return c.json({ message: 'ลบคิวสำเร็จ (ทำงานได้เพราะเป็น Admin)' })
})

// 4. สั่งเปิดเซิร์ฟเวอร์
export default app