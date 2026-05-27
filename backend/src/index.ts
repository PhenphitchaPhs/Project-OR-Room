import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
  RESEND_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// เปิด CORS ให้หน้าบ้าน (Vue) เข้ามาใช้งานได้
app.use('/*', cors())


// ==========================================
// 🔐 1. AUTHENTICATION (ระบบยืนยันตัวตน)
// ==========================================

// 🟢 สมัครสมาชิก (Register) - อัปเดตเพิ่ม Email
app.post('/api/register', async (c) => {
  try {
    const { license, doctorName, email, password, day } = await c.req.json()

    if (!license || !doctorName || !email || !password || !day) {
      return c.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, 400)
    }

    // เช็ก License ซ้ำ
    const existingUser = await c.env.DB.prepare('SELECT * FROM users WHERE license = ?').bind(license).first()
    if (existingUser) return c.json({ error: 'License นี้ถูกใช้งานแล้ว' }, 400)

    // เช็ก Email ซ้ำ
    const existingEmail = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
    if (existingEmail) return c.json({ error: 'Email นี้ถูกใช้งานแล้ว' }, 400)

    // บันทึกข้อมูล (เพิ่ม role เริ่มต้นเป็น 'user')
    await c.env.DB.prepare(`
      INSERT INTO users (license, doctorName, email, password, day, role) 
      VALUES (?, ?, ?, ?, ?, 'user')
    `).bind(license, doctorName, email, password, day).run()

    return c.json({ success: true, message: 'สมัครสมาชิกสำเร็จ' }, 201)
  } catch (e) {
    console.error(e)
    return c.json({ error: 'ระบบสมัครสมาชิกขัดข้อง' }, 500)
  }
})

// 🟢 เข้าสู่ระบบ (Login)
app.post('/api/login', async (c) => {
  const { license, password } = await c.req.json()
  try {
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE license = ? AND password = ?').bind(license, password).first()
    if (user) return c.json({ success: true, user })
    return c.json({ error: 'เลข License หรือ รหัสผ่านไม่ถูกต้อง!' }, 401)
  } catch (e) {
    return c.json({ error: 'DB Fetch Error' }, 500)
  }
})

// 🟢 ลืมรหัสผ่าน (Demo Mode)
app.post('/api/forgot-password', async (c) => {
  const { email } = await c.req.json()
  try {
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
    if (!user) return c.json({ error: 'ไม่พบอีเมลนี้ในระบบ' }, 404)

    const token = crypto.randomUUID()
    const expiry = Date.now() + 3600000 

    await c.env.DB.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?').bind(token, expiry, email).run()

    const resetLink = `https://project-or-room.vercel.app/newpassword?token=${token}`
    
    return c.json({ success: true, demoLink: resetLink, message: 'Demo Mode: ข้ามการส่งอีเมลจริง' })
  } catch (e) {
    return c.json({ error: 'ระบบขัดข้อง' }, 500)
  }
})


// ==========================================
// 👤 2. USERS MANAGEMENT (จัดการผู้ใช้งาน)
// ==========================================

// 🟢 ดึงรายชื่อผู้ใช้ทั้งหมด (สำหรับ Admin)
app.get('/api/users', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT license, doctorName, day, role FROM users').all()
    return c.json(results)
  } catch (e) {
    return c.json({ error: 'DB Fetch Error' }, 500)
  }
})

// 🟢 ดึงข้อมูลผู้ใช้รายคน
app.get('/api/users/:license', async (c) => {
  const license = c.req.param('license')
  try {
    const user = await c.env.DB.prepare('SELECT day FROM users WHERE license = ?').bind(license).first()
    if (user) return c.json(user)
    return c.json({ error: 'ไม่พบผู้ใช้' }, 404)
  } catch (e) {
    return c.json({ error: 'DB Fetch Error' }, 500)
  }
})

// 🟢 เปลี่ยนวันทำงาน
app.put('/api/users/:license/day', async (c) => {
  const { day } = await c.req.json()
  const license = c.req.param('license')
  try {
    const info = await c.env.DB.prepare('UPDATE users SET day = ? WHERE license = ?').bind(day, license).run()
    if (info.meta.changes === 0) return c.json({ error: `หา License '${license}' ไม่เจอในระบบ` }, 404)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Update Failed' }, 500)
  }
})

// 🔴 ลบบัญชีผู้ใช้ (ห้ามลบ Admin และไม่ลบข้อมูลคิวผ่าตัด)
app.delete('/api/users/:license', async (c) => {
  const license = c.req.param('license')
  try {
    const user = await c.env.DB.prepare('SELECT role FROM users WHERE license = ?').bind(license).first()
    if (!user) return c.json({ error: 'ไม่พบบัญชีนี้ในระบบ' }, 404)
    if (user.role === 'admin') return c.json({ error: 'ไม่อนุญาตให้ลบบัญชี Admin' }, 403)

    await c.env.DB.prepare('DELETE FROM users WHERE license = ?').bind(license).run()
    return c.json({ success: true, message: 'ลบบัญชีเรียบร้อยแล้ว (ข้อมูลคนไข้ยังคงอยู่)' })
  } catch (e) {
    return c.json({ error: 'ระบบลบข้อมูลขัดข้อง' }, 500)
  }
})


// ==========================================
// 🏥 3. BOOKINGS (จัดการคิวผ่าตัด)
// ==========================================

// 🟢 ดึงคิวทั้งหมด (รองรับการกรองด้วย License)
app.get('/api/bookings', async (c) => {
  const license = c.req.query('license')
  try {
    const { results } = license
      ? await c.env.DB.prepare('SELECT * FROM bookings WHERE doctorLicense = ? ORDER BY date ASC').bind(license).all()
      : await c.env.DB.prepare('SELECT * FROM bookings ORDER BY date ASC').all()
    return c.json(results)
  } catch (e) {
    return c.json({ error: 'DB Fetch Error' }, 500)
  }
})

// 🟢 เพิ่มคิวใหม่
app.post('/api/bookings', async (c) => {
  const b = await c.req.json()
  try {
    // อัปเดตคำสั่ง INSERT ให้รองรับข้อมูล cxr, ecg, lab, adm
    await c.env.DB.prepare(`
      INSERT INTO bookings (
        hn, fullName, dob, age, gender, procedure, date, urgency, isNpoRisk, isInfected, underlying, 
        cxrDate, cxrNote, ecgDate, ecgNote, labDate, labNote, admDate, admNote, 
        notes, status, room, doctorLicense, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))
    `).bind(
      b.hn, b.fullName, b.dob, b.age, b.gender, b.procedure, 
      b.date, b.urgency, b.isNpoRisk ? 1 : 0, b.isInfected ? 1 : 0, b.underlying, 
      b.cxrDate, b.cxrNote, b.ecgDate, b.ecgNote, b.labDate, b.labNote, b.admDate, b.admNote, 
      b.notes, 'Upcoming', 'OR-01', b.doctorLicense 
    ).run()
    return c.json({ success: true }, 201)
  } catch (e) {
    console.error("DB Insert Error:", e)
    return c.json({ error: 'DB Insert Error' }, 500)
  }
})

// 🟢 อัปเดตสถานะคิว (เช่น Upcoming -> Succeed)
app.patch('/api/bookings/:id/status', async (c) => {
  const id = c.req.param('id')
  const { status } = await c.req.json()
  try {
    await c.env.DB.prepare('UPDATE bookings SET status = ? WHERE id = ?').bind(status, id).run()
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Update Failed' }, 500)
  }
})

// 🟢 อัปเดตลำดับคิวแบบลากวาง (Drag & Drop)
app.put('/api/bookings/reorder', async (c) => {
  const { updates } = await c.req.json()
  try {
    const statements = updates.map((u: any) => c.env.DB.prepare('UPDATE bookings SET queueOrder = ? WHERE id = ?').bind(u.queueOrder, u.id))
    await c.env.DB.batch(statements)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Reorder Failed' }, 500)
  }
})

// 🔴 ลบคิวผ่าตัด
app.delete('/api/bookings/:id', async (c) => {
  const id = c.req.param('id')
  try {
    await c.env.DB.prepare('DELETE FROM bookings WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'DB Delete Error' }, 500)
  }
})


// ==========================================
// 😷 4. PATIENTS (ข้อมูลผู้ป่วย)
// ==========================================

// 🟢 ค้นหาข้อมูลผู้ป่วยเก่าจาก HN (สำหรับ autofill)
app.get('/api/patients/:hn', async (c) => {
  const hn = c.req.param('hn')
  try {
    const patient = await c.env.DB.prepare(`
      SELECT hn, fullName, dob, gender, underlying 
      FROM bookings WHERE hn = ? ORDER BY createdAt DESC LIMIT 1
    `).bind(hn).first()
    
    if (patient) return c.json(patient)
    return c.json({ error: 'ไม่พบผู้ป่วย' }, 404)
  } catch (e) {
    return c.json({ error: 'DB Fetch Error' }, 500)
  }
})

export default app