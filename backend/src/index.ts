import { Hono } from 'hono'
import { cors } from 'hono/cors'
import bcrypt from 'bcryptjs' // 📍 เพิ่มตัวเข้ารหัสไว้บนสุด

// 📍 อัปเดต Bindings ให้รองรับคีย์ของ EmailJS แทน Resend
type Bindings = {
  DB: D1Database
  EMAILJS_SERVICE_ID: string
  EMAILJS_TEMPLATE_ID: string
  EMAILJS_PUBLIC_KEY: string
  EMAILJS_PRIVATE_KEY: string
  HOLIDAY_API_KEY: string 
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors({
  origin: '*', 
  allowHeaders: ['Content-Type', 'Authorization', 'x-user-license'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'], 
  maxAge: 600, 
}))

// ==========================================
// 🛡️ ROLE-BASED ACCESS CONTROL (RBAC)
// ==========================================
const ADMIN_ROLES = ['admin']

const normalizeRole = (role: string | null | undefined) =>
  (role ?? '').toString().trim().toLowerCase().replace(/[\s-]+/g, '_')

const hasAdminAccess = (role: string | null | undefined) => {
  const r = normalizeRole(role)
  return ADMIN_ROLES.includes(r) || r.includes('admin')
}

const getRequesterRole = async (c: any): Promise<string | null> => {
  const requesterLicense = c.req.header('x-user-license')
  if (!requesterLicense) return null
  const requester = await c.env.DB.prepare('SELECT role FROM users WHERE license = ?').bind(requesterLicense).first()
  return requester ? String(requester.role) : null
}


// ==========================================
// 🔐 1. AUTHENTICATION & OTP (ระบบยืนยันตัวตน)
// ==========================================

// 🟢 ส่ง OTP ยืนยันอีเมล (ผ่าน EmailJS Backend)
app.post('/api/send-otp', async (c) => {
  try {
    const { email } = await c.req.json()
    if (!email) return c.json({ error: 'กรุณาระบุอีเมล' }, 400)

    const existingUser = await c.env.DB.prepare('SELECT email FROM users WHERE email = ?').bind(email).first()
    if (existingUser) return c.json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' }, 400)

    // สุ่มรหัส 6 หลัก และตั้งเวลาหมดอายุ 5 นาที
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiry = Date.now() + 300000 

    // บันทึกลงตาราง otps (ใช้ ON CONFLICT เพื่ออัปเดตรหัสใหม่ถ้าขอซ้ำ)
    await c.env.DB.prepare(`
      INSERT INTO otps (email, otp, expiry) VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET otp = excluded.otp, expiry = excluded.expiry
    `).bind(email, otp, expiry).run()

    // ส่งอีเมลผ่าน EmailJS REST API
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service_id: c.env.EMAILJS_SERVICE_ID,
        template_id: c.env.EMAILJS_TEMPLATE_ID,
        user_id: c.env.EMAILJS_PUBLIC_KEY,
        accessToken: c.env.EMAILJS_PRIVATE_KEY,
        template_params: {
          to_email: email,
          otp: otp
        }
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('EmailJS Error:', errorText)
      throw new Error('Failed to send email via EmailJS')
    }

    return c.json({ success: true, message: 'ส่งรหัสยืนยันไปยังอีเมลแล้ว' })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่' }, 500)
  }
})

// 🟢 สมัครสมาชิก (Register) - ตรวจสอบ OTP ก่อนบันทึก
app.post('/api/register', async (c) => {
  try {
    const { license, doctorName, email, password, orNumber, otp } = await c.req.json()

    if (!license || !doctorName || !email || !password || !orNumber || !otp) {
      return c.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, 400)
    }

    // 1. ตรวจสอบ OTP
    const otpRecord = await c.env.DB.prepare('SELECT * FROM otps WHERE email = ?').bind(email).first()
    if (!otpRecord || String(otpRecord.otp) !== String(otp)) {
      return c.json({ error: 'รหัส OTP ไม่ถูกต้อง หรือยังไม่ได้กดส่งรหัส' }, 400)
    }
    if (Date.now() > Number(otpRecord.expiry)) {
      return c.json({ error: 'รหัส OTP หมดอายุแล้ว กรุณาขอใหม่' }, 400)
    }

    // 2. ตรวจสอบข้อมูลซ้ำ
    const existingUser = await c.env.DB.prepare('SELECT * FROM users WHERE license = ? OR email = ?').bind(license, email).first()
    if (existingUser) return c.json({ error: 'License หรือ Email นี้ถูกใช้งานแล้ว' }, 400)

    // 3. เข้ารหัสรหัสผ่านและบันทึกลง Database
    const hashedPassword = bcrypt.hashSync(password, 10)
    await c.env.DB.prepare(`
      INSERT INTO users (license, doctorName, email, password, orNumber, role) 
      VALUES (?, ?, ?, ?, ?, 'user')
    `).bind(license, doctorName, email, hashedPassword, orNumber).run()

    // 4. ลบ OTP ทิ้งหลังใช้งานเสร็จ
    await c.env.DB.prepare('DELETE FROM otps WHERE email = ?').bind(email).run()

    return c.json({ success: true, message: 'สมัครสมาชิกสำเร็จ' }, 201)
  } catch (e) {
    console.error(e)
    return c.json({ error: 'ระบบสมัครสมาชิกขัดข้อง' }, 500)
  }
})

// 🟢 เข้าสู่ระบบ (Login) - เปลี่ยนมาใช้ Email และรองรับ Lazy Migration ให้บัญชีเก่า
app.post('/api/login', async (c) => {
  try {
    const { email, password, license } = await c.req.json()
    // 📍 รองรับทั้งหน้า user (ส่ง email) และหน้า admin (ส่ง license)
    const identifier = email ?? license
    if (!identifier) return c.json({ error: 'กรุณากรอกอีเมล/เลขใบอนุญาต และรหัสผ่าน' }, 400)

    // ค้นหาผู้ใช้ด้วย email หรือ license
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? OR license = ?').bind(identifier, identifier).first()
    if (!user) {
      return c.json({ error: 'อีเมล หรือ รหัสผ่านไม่ถูกต้อง!' }, 401)
    }

    const dbPassword = String(user.password)
    let isPasswordMatch = false

    if (dbPassword.startsWith('$2a$') || dbPassword.startsWith('$2b$')) {
      // เคสบัญชีที่เข้ารหัสรหัสผ่านแล้ว
      isPasswordMatch = bcrypt.compareSync(password, dbPassword)
    } else {
      // เคสบัญชีเก่า (Plain Text)
      if (password === dbPassword) {
        isPasswordMatch = true
        
        // Lazy Migration: เข้ารหัสรหัสผ่านแล้วเซฟทับให้ทันที (ใช้ license ที่มีเสมอ)
        const hashedNewPassword = bcrypt.hashSync(password, 10)
        await c.env.DB.prepare('UPDATE users SET password = ? WHERE license = ?')
          .bind(hashedNewPassword, user.license).run()
      }
    }

    if (isPasswordMatch) {
      return c.json({ success: true, user })
    } else {
      return c.json({ error: 'อีเมล หรือ รหัสผ่านไม่ถูกต้อง!' }, 401)
    }
  } catch (e) {
    console.error(e)
    return c.json({ error: 'ระบบเข้าสู่ระบบขัดข้อง' }, 500)
  }
})

// 🟢 ลืมรหัสผ่าน
app.post('/api/forgot-password', async (c) => {
  const { email } = await c.req.json()
  try {
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
    if (!user) return c.json({ error: 'ไม่พบอีเมลนี้ในระบบ' }, 404)

    const token = crypto.randomUUID()
    const expiry = Date.now() + 3600000 

    await c.env.DB.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?').bind(token, expiry, email).run()

    const resetLink = `https://project-or-room.vercel.app/newpassword?token=${token}`

    return c.json({ success: true, resetLink, message: 'สร้างลิงก์รีเซ็ตรหัสผ่านสำเร็จ' })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'ระบบขัดข้อง' }, 500)
  }
})

// 🟢 ตั้งรหัสผ่านใหม่ด้วย token
app.post('/api/reset-password', async (c) => {
  try {
    const { token, newPassword } = await c.req.json()
    if (!token || !newPassword) {
      return c.json({ error: 'ข้อมูลไม่ครบถ้วน' }, 400)
    }

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE reset_token = ?').bind(token).first()
    if (!user) return c.json({ error: 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง หรือถูกใช้ไปแล้ว' }, 400)

    const expiry = Number(user.reset_token_expiry)
    if (!expiry || Date.now() > expiry) {
      return c.json({ error: 'ลิงก์รีเซ็ตรหัสผ่านหมดอายุแล้ว กรุณาขอลิงก์ใหม่' }, 400)
    }

    const hashedNewPassword = bcrypt.hashSync(newPassword, 10)

    await c.env.DB.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE reset_token = ?')
      .bind(hashedNewPassword, token).run()

    return c.json({ success: true, message: 'ตั้งรหัสผ่านใหม่สำเร็จ' })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'ระบบรีเซ็ตรหัสผ่านขัดข้อง' }, 500)
  }
})


// ==========================================
// 👤 2. USERS MANAGEMENT (จัดการผู้ใช้งาน)
// ==========================================

app.get('/api/users', async (c) => {
  const role = await getRequesterRole(c)
  if (!hasAdminAccess(role)) return c.json({ error: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้' }, 403)

  try {
    const { results } = await c.env.DB.prepare('SELECT license, doctorName, email, orNumber, role FROM users').all()
    return c.json(results)
  } catch (e) {
    return c.json({ error: 'DB Fetch Error' }, 500)
  }
})

app.get('/api/users/:license', async (c) => {
  const license = c.req.param('license')
  try {
    const user = await c.env.DB.prepare('SELECT orNumber FROM users WHERE license = ?').bind(license).first()
    if (user) return c.json(user)
    return c.json({ error: 'ไม่พบผู้ใช้' }, 404)
  } catch (e) {
    return c.json({ error: 'DB Fetch Error' }, 500)
  }
})

app.put('/api/users/:license/or-number', async (c) => {
  const { orNumber } = await c.req.json()
  const license = c.req.param('license')

  const requesterLicense = c.req.header('x-user-license')
  const role = await getRequesterRole(c)
  if (requesterLicense !== license && !hasAdminAccess(role)) {
    return c.json({ error: 'ไม่มีสิทธิ์แก้ไขข้อมูลบัญชีนี้' }, 403)
  }

  try {
    const info = await c.env.DB.prepare('UPDATE users SET orNumber = ? WHERE license = ?').bind(orNumber, license).run()
    if (info.meta.changes === 0) return c.json({ error: `หา License '${license}' ไม่เจอในระบบ` }, 404)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Update Failed' }, 500)
  }
})

app.put('/api/users/:license/role', async (c) => {
  const role = await getRequesterRole(c)
  if (!hasAdminAccess(role)) return c.json({ error: 'ไม่มีสิทธิ์เปลี่ยน Role ผู้ใช้' }, 403)

  const { newRole } = await c.req.json()
  const license = c.req.param('license')
  const allowedRoles = ['user', 'admin']

  if (!allowedRoles.includes(newRole)) {
    return c.json({ error: `Role ไม่ถูกต้อง ต้องเป็นหนึ่งใน ${allowedRoles.join(', ')}` }, 400)
  }

  try {
    const info = await c.env.DB.prepare('UPDATE users SET role = ? WHERE license = ?').bind(newRole, license).run()
    if (info.meta.changes === 0) return c.json({ error: `หา License '${license}' ไม่เจอในระบบ` }, 404)
    return c.json({ success: true, message: `เปลี่ยน Role เป็น '${newRole}' สำเร็จ` })
  } catch (e) {
    return c.json({ error: 'Update Role Failed' }, 500)
  }
})

app.delete('/api/users/:license', async (c) => {
  const requesterRole = await getRequesterRole(c)
  if (!hasAdminAccess(requesterRole)) return c.json({ error: 'ไม่มีสิทธิ์ลบบัญชีผู้ใช้' }, 403)

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

app.post('/api/bookings', async (c) => {
  const b = await c.req.json()
  const requesterLicense = c.req.header('x-user-license')
  if (!requesterLicense) return c.json({ error: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่' }, 401)

  if (b.doctorLicense && b.doctorLicense !== requesterLicense) {
    const role = await getRequesterRole(c)
    if (!hasAdminAccess(role)) {
      return c.json({ error: 'ไม่มีสิทธิ์จองคิวแทนแพทย์ท่านอื่น' }, 403)
    }
  }

  try {
    await c.env.DB.prepare(`
      INSERT INTO bookings (
        hn, fullName, dob, age, gender, procedure, date, underlying, 
        cxrDate, cxrNote, ecgDate, ecgNote, labDate, labNote, admDate, admNote, 
        notes, status, room, doctorLicense, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))
    `).bind(
      b.hn, b.fullName, b.dob, b.age, b.gender, b.procedure, 
      b.date, b.underlying, 
      b.cxrDate, b.cxrNote, b.ecgDate, b.ecgNote, b.labDate, b.labNote, b.admDate, b.admNote, 
      b.notes, 'Upcoming', b.room || 'OR-01', b.doctorLicense 
    ).run()
    return c.json({ success: true }, 201)
  } catch (e) {
    console.error("DB Insert Error:", e)
    return c.json({ error: 'DB Insert Error' }, 500)
  }
})

app.put('/api/bookings/:id', async (c) => {
  const id = c.req.param('id')
  const b = await c.req.json()
  try {
    const existing = await c.env.DB.prepare('SELECT id, doctorLicense FROM bookings WHERE id = ?').bind(id).first()
    if (!existing) return c.json({ error: 'ไม่พบคิวนี้ในระบบ' }, 404)

    const requesterLicense = c.req.header('x-user-license')
    if (!requesterLicense) return c.json({ error: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่' }, 401)
    
    if (existing.doctorLicense !== requesterLicense) {
      const role = await getRequesterRole(c)
      if (!hasAdminAccess(role)) return c.json({ error: 'ไม่มีสิทธิ์แก้ไขคิวนี้' }, 403)
    }

    await c.env.DB.prepare(`
      UPDATE bookings SET
        hn = ?, fullName = ?, age = ?, gender = ?, procedure = ?, date = ?, room = ?, underlying = ?,
        cxrDate = ?, cxrNote = ?, ecgDate = ?, ecgNote = ?, labDate = ?, labNote = ?, admDate = ?, admNote = ?,
        notes = ?
      WHERE id = ?
    `).bind(
      b.hn, b.fullName, b.age, b.gender, b.procedure, b.date, b.room || 'OR-01', b.underlying,
      b.cxrDate, b.cxrNote, b.ecgDate, b.ecgNote, b.labDate, b.labNote, b.admDate, b.admNote,
      b.notes, id
    ).run()

    return c.json({ success: true, message: 'อัปเดตคิวสำเร็จ' })
  } catch (e) {
    console.error("DB Update Error:", e)
    return c.json({ error: 'DB Update Error' }, 500)
  }
})

app.patch('/api/bookings/:id/status', async (c) => {
  const id = c.req.param('id')
  const { status } = await c.req.json()
  try {
    const existing = await c.env.DB.prepare('SELECT doctorLicense FROM bookings WHERE id = ?').bind(id).first()
    if (!existing) return c.json({ error: 'ไม่พบคิวนี้ในระบบ' }, 404)

    const requesterLicense = c.req.header('x-user-license')
    if (!requesterLicense) return c.json({ error: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่' }, 401)
    
    if (existing.doctorLicense !== requesterLicense) {
      const role = await getRequesterRole(c)
      if (!hasAdminAccess(role)) return c.json({ error: 'ไม่มีสิทธิ์เปลี่ยนสถานะคิวนี้' }, 403)
    }

    await c.env.DB.prepare('UPDATE bookings SET status = ? WHERE id = ?').bind(status, id).run()
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Update Failed' }, 500)
  }
})

app.put('/api/bookings/reorder', async (c) => {
  const requesterLicense = c.req.header('x-user-license')
  if (!requesterLicense) return c.json({ error: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่' }, 401)
  const role = await getRequesterRole(c)
  if (!role) return c.json({ error: 'ไม่มีสิทธิ์จัดลำดับคิว' }, 403)

  const { updates } = await c.req.json()
  try {
    const statements = updates.map((u: any) => c.env.DB.prepare('UPDATE bookings SET queueOrder = ? WHERE id = ?').bind(u.queueOrder, u.id))
    await c.env.DB.batch(statements)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Reorder Failed' }, 500)
  }
})


// ==========================================
// 😷 4. PATIENTS (ข้อมูลผู้ป่วย)
// ==========================================

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


// ==========================================
// 📅 5. HOLIDAYS (จัดการวันหยุดราชการ - มี Cache)
// ==========================================

app.get('/api/holidays', async (c) => {
  const apiKey = c.env.HOLIDAY_API_KEY 
  
  try {
    const calendarId = encodeURIComponent('th.th#holiday@group.v.calendar.google.com')
    const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}`
    
    const response = await fetch(url, {
      cf: { cacheTtl: 86400 }
    })
    const holidayData = await response.json()
    
    c.header('Cache-Control', 'public, max-age=86400')
    return c.json(holidayData)
  } catch (error) {
    return c.json({ error: 'ไม่สามารถดึงข้อมูลวันหยุดได้' }, 500)
  }
})

export default app