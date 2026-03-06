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
      INSERT INTO bookings (hn, fullName, dob, age, gender, procedure, date, urgency, isNpoRisk, isInfected, underlying, notes, status, room)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      b.hn, b.fullName, b.dob, b.age, b.gender, b.procedure, 
      b.date, b.urgency, b.isNpoRisk ? 1 : 0, b.isInfected ? 1 : 0, 
      b.underlying, b.notes, 'Upcoming', 'OR-01' // 👈 เพิ่ม b.underlying เข้ามาตรงนี้
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
// 🟢 4. API สำหรับสมัครสมาชิก (Register)
app.post('/api/register', async (c) => {
  const { license, doctorName, password, day } = await c.req.json()
  try {
    await c.env.DB.prepare(`
      INSERT INTO users (license, doctorName, password, day)
      VALUES (?, ?, ?, ?)
    `).bind(license, doctorName, password, day).run()
    
    return c.json({ success: true }, 201)
  } catch (e) {
    // ถ้า Insert ไม่ผ่าน มักจะเกิดจากเลข License ซ้ำ (ติด UNIQUE constraint)
    return c.json({ error: 'มีเลข License นี้ในระบบแล้ว หรือเกิดข้อผิดพลาด' }, 400)
  }
})

// 🟢 5. API สำหรับเข้าสู่ระบบ (Login)
app.post('/api/login', async (c) => {
  const { license, password } = await c.req.json()
  try {
    // ค้นหาว่ามี License และ Password นี้ในฐานข้อมูลหรือไม่
    const user = await c.env.DB.prepare(`
      SELECT * FROM users WHERE license = ? AND password = ?
    `).bind(license, password).first()

    if (user) {
      return c.json({ success: true, user })
    } else {
      return c.json({ error: 'เลข License หรือ รหัสผ่านไม่ถูกต้อง!' }, 401)
    }
  } catch (e) {
    return c.json({ error: 'DB Fetch Error' }, 500)
  }
})

// 🟢 API 1: สำหรับดึงข้อมูลวันทำงานของคุณหมอ (ถามผ่าน License)
app.get('/api/users/:license', async (c) => {
  const license = c.req.param('license')
  try {
    // ไปดึงค่า day จากตาราง users
    const user = await c.env.DB.prepare('SELECT day FROM users WHERE license = ?').bind(license).first()
    if (user) {
      return c.json(user)
    }
    return c.json({ error: 'ไม่พบผู้ใช้' }, 404)
  } catch (e) {
    return c.json({ error: 'DB Fetch Error' }, 500)
  }
})

// 🟢 API 2: สำหรับอัปเดตเปลี่ยนวันทำงานใน Cloudflare (เพิ่มระบบเช็กว่าอัปเดตจริงไหม)
app.put('/api/users/:license/day', async (c) => {
  const { day } = await c.req.json()
  const license = c.req.param('license')   // ดึงจาก URL แทน body
  try {
    // ใช้ตัวแปร info มารับผลลัพธ์การรันคำสั่ง
    const info = await c.env.DB.prepare('UPDATE users SET day = ? WHERE license = ?').bind(day, license).run()
    
    // 🚨 เช็กว่าอัปเดตไปกี่บรรทัด ถ้าเป็น 0 แปลว่าหาเลข License นั้นไม่เจอในฐานข้อมูล!
    if (info.meta.changes === 0) {
      console.log(`❌ ไม่พบ License: "${license}" ในฐานข้อมูล`)
      return c.json({ error: `หา License '${license}' ไม่เจอในฐานข้อมูล Cloudflare!` }, 404)
    }

    console.log(`✅ อัปเดตวันทำงานเป็น ${day} ให้ License: ${license} สำเร็จ!`)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Update Failed' }, 500)
  }
})

export default app