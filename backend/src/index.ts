import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// เปิด CORS ให้หน้าบ้าน (Vue) เข้ามาจิ้มได้
app.use('/*', cors())

// 🟢 1. ดึงคิวทั้งหมด (ใช้หน้า Home/Calendar)
app.get('/api/bookings', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM bookings ORDER BY date ASC').all()
    return c.json(results)
  } catch (e) {
    return c.json({ error: 'DB Fetch Error' }, 500)
  }
})

// 🟢 2. เพิ่มคิวใหม่ (ใช้หน้า Booking)
app.post('/api/bookings', async (c) => {
  const b = await c.req.json()
  try {
    await c.env.DB.prepare(`
      INSERT INTO bookings (hn, fullName, dob, age, gender, procedure, date, urgency, isNpoRisk, isInfected, notes, status, room)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      b.hn, b.fullName, b.dob, b.age, b.gender, b.procedure, 
      b.date, b.urgency, b.isNpoRisk ? 1 : 0, b.isInfected ? 1 : 0, b.notes,
      'Upcoming', 'OR-01' // 👈 ใส่ค่า Default ลงไป
    ).run()
    return c.json({ success: true }, 201)
  } catch (e) {
    return c.json({ error: 'DB Insert Error' }, 500)
  }
})

// 🔴 3. ลบคิว (สำหรับปุ่ม Delete ในหน้า Home)
app.delete('/api/bookings/:id', async (c) => {
  const id = c.req.param('id')
  try {
    await c.env.DB.prepare('DELETE FROM bookings WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'DB Delete Error' }, 500)
  }
})

export default app