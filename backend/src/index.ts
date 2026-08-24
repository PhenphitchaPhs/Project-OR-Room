import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign, verify } from 'hono/jwt'
import bcrypt from 'bcryptjs'

type Bindings = {
  DB: D1Database
  EMAILJS_SERVICE_ID: string
  EMAILJS_TEMPLATE_ID: string
  EMAILJS_PUBLIC_KEY: string
  EMAILJS_PRIVATE_KEY: string
  HOLIDAY_API_KEY: string
  JWT_SECRET: string
}

type AuthUser = {
  license: string
  role: string
}

type Variables = {
  user: AuthUser
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const ALLOWED_ORIGINS = [
  'https://project-or-room.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

app.use('/*', cors({
  origin: (origin) => (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]),
  allowHeaders: ['Content-Type', 'Authorization'],
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

// ==========================================
// 🔑 JWT AUTHENTICATION
// ==========================================
const TOKEN_TTL_SECONDS = 8 * 60 * 60
const JWT_ALG = 'HS256' as const

const issueToken = async (secret: string, user: { license: string; role: string }) => {
  const now = Math.floor(Date.now() / 1000)
  return sign(
    {
      license: user.license,
      role: user.role,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    },
    secret,
    JWT_ALG,
  )
}

const authMiddleware = async (c: any, next: any) => {
  if (!c.env.JWT_SECRET) {
    console.error('❌ ไม่ได้ตั้ง JWT_SECRET — ปฏิเสธทุก request ที่ต้องยืนยันตัวตน')
    return c.json({ error: 'เซิร์ฟเวอร์ตั้งค่าไม่ครบ กรุณาติดต่อผู้ดูแลระบบ' }, 500)
  }

  const header = c.req.header('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''

  if (!token) {
    return c.json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, 401)
  }

  try {
    const payload = await verify(token, c.env.JWT_SECRET, JWT_ALG)

    if (!payload?.license) {
      return c.json({ error: 'โทเคนไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' }, 401)
    }

    c.set('user', {
      license: String(payload.license),
      role: String(payload.role || 'user'),
    })

    await next()
  } catch (e) {
    return c.json({ error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' }, 401)
  }
}

const requireAdmin = async (c: any, next: any) => {
  const user = c.get('user') as AuthUser | undefined
  if (!hasAdminAccess(user?.role)) {
    return c.json({ error: 'ต้องมีสิทธิ์แอดมินจึงจะใช้งานส่วนนี้ได้' }, 403)
  }
  await next()
}

const PUBLIC_PATHS = [
  '/api/login',
  '/api/register',
  '/api/send-otp',
  '/api/forgot-password',
  '/api/reset-password',
  '/api/holidays',
]

app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return next()
  if (PUBLIC_PATHS.includes(new URL(c.req.url).pathname)) return next()
  return authMiddleware(c, next)
})


// ==========================================
// 🔐 1. AUTHENTICATION & OTP
// ==========================================
app.post('/api/send-otp', async (c) => {
  try {
    const { email } = await c.req.json()
    if (!email) return c.json({ error: 'กรุณาระบุอีเมล' }, 400)

    const existingUser = await c.env.DB.prepare('SELECT email FROM users WHERE email = ?').bind(email).first()
    if (existingUser) return c.json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' }, 400)

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiry = Date.now() + 300000 

    await c.env.DB.prepare(`
      INSERT INTO otps (email, otp, expiry) VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET otp = excluded.otp, expiry = excluded.expiry
    `).bind(email, otp, expiry).run()

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

app.post('/api/register', async (c) => {
  try {
    const { license, doctorName, email, password, orNumber, otp } = await c.req.json()

    if (!license || !doctorName || !email || !password || !orNumber || !otp) {
      return c.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, 400)
    }

    const otpRecord = await c.env.DB.prepare('SELECT * FROM otps WHERE email = ?').bind(email).first()
    if (!otpRecord || String(otpRecord.otp) !== String(otp)) {
      return c.json({ error: 'รหัส OTP ไม่ถูกต้อง หรือยังไม่ได้กดส่งรหัส' }, 400)
    }
    if (Date.now() > Number(otpRecord.expiry)) {
      return c.json({ error: 'รหัส OTP หมดอายุแล้ว กรุณาขอใหม่' }, 400)
    }

    const existingUser = await c.env.DB.prepare('SELECT * FROM users WHERE license = ? OR email = ?').bind(license, email).first()
    if (existingUser) return c.json({ error: 'License หรือ Email นี้ถูกใช้งานแล้ว' }, 400)

    const hashedPassword = bcrypt.hashSync(password, 10)
    await c.env.DB.prepare(`
      INSERT INTO users (license, doctorName, email, password, orNumber, role) 
      VALUES (?, ?, ?, ?, ?, 'user')
    `).bind(license, doctorName, email, hashedPassword, orNumber).run()

    await c.env.DB.prepare('DELETE FROM otps WHERE email = ?').bind(email).run()

    return c.json({ success: true, message: 'สมัครสมาชิกสำเร็จ' }, 201)
  } catch (e) {
    console.error(e)
    return c.json({ error: 'ระบบสมัครสมาชิกขัดข้อง' }, 500)
  }
})

app.post('/api/login', async (c) => {
  try {
    const { email, password, license } = await c.req.json()
    const identifier = email ?? license
    if (!identifier) return c.json({ error: 'กรุณากรอกอีเมล/เลขใบอนุญาต และรหัสผ่าน' }, 400)

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? OR license = ?').bind(identifier, identifier).first()
    if (!user) {
      return c.json({ error: 'อีเมล หรือ รหัสผ่านไม่ถูกต้อง!' }, 401)
    }

    const dbPassword = String(user.password)
    let isPasswordMatch = false

    if (dbPassword.startsWith('$2a$') || dbPassword.startsWith('$2b$')) {
      isPasswordMatch = bcrypt.compareSync(password, dbPassword)
    } else {
      if (password === dbPassword) {
        isPasswordMatch = true
        const hashedNewPassword = bcrypt.hashSync(password, 10)
        await c.env.DB.prepare('UPDATE users SET password = ? WHERE license = ?')
          .bind(hashedNewPassword, user.license).run()
      }
    }

    if (!isPasswordMatch) {
      return c.json({ error: 'อีเมล หรือ รหัสผ่านไม่ถูกต้อง!' }, 401)
    }

    if (!c.env.JWT_SECRET) {
      console.error('❌ ไม่ได้ตั้ง JWT_SECRET — ออก token ไม่ได้')
      return c.json({ error: 'เซิร์ฟเวอร์ตั้งค่าไม่ครบ กรุณาติดต่อผู้ดูแลระบบ' }, 500)
    }

    const token = await issueToken(c.env.JWT_SECRET, {
      license: String(user.license),
      role: String(user.role || 'user'),
    })

    const safeUser = {
      license: user.license,
      doctorName: user.doctorName,
      email: user.email,
      orNumber: user.orNumber,
      role: user.role,
    }

    return c.json({ success: true, token, expiresIn: TOKEN_TTL_SECONDS, user: safeUser })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'ระบบเข้าสู่ระบบขัดข้อง' }, 500)
  }
})

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
// 👤 2. USERS MANAGEMENT
// ==========================================
app.get('/api/users', requireAdmin, async (c) => {
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

  const requester = c.get('user')
  if (requester.license !== license && !hasAdminAccess(requester.role)) {
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

app.put('/api/users/:license/role', requireAdmin, async (c) => {
  const { newRole } = await c.req.json()
  const license = c.req.param('license')
  const allowedRoles = ['user', 'admin']

  if (!allowedRoles.includes(newRole)) {
    return c.json({ error: `Role ไม่ถูกต้อง ต้องเป็นหนึ่งใน ${allowedRoles.join(', ')}` }, 400)
  }

  if (c.get('user').license === license) {
    return c.json({ error: 'ไม่อนุญาตให้แก้ไข Role ของบัญชีตัวเอง ต้องให้แอดมินท่านอื่นดำเนินการ' }, 403)
  }

  try {
    const info = await c.env.DB.prepare('UPDATE users SET role = ? WHERE license = ?').bind(newRole, license).run()
    if (info.meta.changes === 0) return c.json({ error: `หา License '${license}' ไม่เจอในระบบ` }, 404)
    return c.json({ success: true, message: `เปลี่ยน Role เป็น '${newRole}' สำเร็จ` })
  } catch (e) {
    return c.json({ error: 'Update Role Failed' }, 500)
  }
})

app.delete('/api/users/:license', requireAdmin, async (c) => {
  const license = c.req.param('license')

  if (c.get('user').license === license) {
    return c.json({ error: 'ไม่อนุญาตให้ลบบัญชีตัวเอง' }, 403)
  }

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

// 📍 Endpoint ใหม่: ดึงเฉพาะข้อมูลตาราง (ไม่ดึง PI) สำหรับใช้ที่หน้า Calendar / นับคิวพรุ่งนี้ / เช็คความจุ
app.get('/api/schedule', async (c) => {
  const from = c.req.query('from')
  const to = c.req.query('to')

  if (!from || !to) {
    return c.json({ error: 'กรุณาระบุวันที่ from และ to' }, 400)
  }

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT
        b.id,
        b.date,
        b.room,
        b.status,
        b.durationMinutes,
        u.orNumber as orNumber
      FROM bookings b
      LEFT JOIN users u ON b.doctorLicense = u.license
      WHERE b.date >= ? AND b.date <= ?
      ORDER BY b.date ASC, b.room ASC
    `).bind(from, to).all()

    return c.json(results)
  } catch (e) {
    console.error('❌ /api/schedule error:', e)
    return c.json({ error: 'DB Fetch Error' }, 500)
  }
})

// 📍 แก้ไข: จำกัด scope ให้เห็นแค่คิวตัวเอง (Admin เห็นหมด) ไม่ปล่อยให้ดึงข้ามสิทธิ์อีกต่อไป
app.get('/api/bookings', async (c) => {
  const requester = c.get('user')

  try {
    if (hasAdminAccess(requester.role)) {
      const { results } = await c.env.DB.prepare('SELECT * FROM bookings ORDER BY date ASC').all()
      return c.json(results)
    } else {
      const { results } = await c.env.DB.prepare('SELECT * FROM bookings WHERE doctorLicense = ? ORDER BY date ASC').bind(requester.license).all()
      return c.json(results)
    }
  } catch (e) {
    return c.json({ error: 'DB Fetch Error' }, 500)
  }
})

app.get('/api/bookings/export', requireAdmin, async (c) => {
  try {
    const splitList = (value: string | undefined) =>
      (value || '').split(',').map((item) => item.trim()).filter(Boolean)

    const rooms = splitList(c.req.query('rooms'))
    const doctors = splitList(c.req.query('doctors'))
    const statuses = splitList(c.req.query('statuses'))
    const from = c.req.query('from')
    const to = c.req.query('to')
    const id = c.req.query('id')

    const conditions: string[] = []
    const params: (string | number)[] = []

    if (id) {
      conditions.push('id = ?')
      params.push(id)
    }
    if (rooms.length) {
      conditions.push(`room IN (${rooms.map(() => '?').join(',')})`)
      params.push(...rooms)
    }
    if (doctors.length) {
      conditions.push(`doctorLicense IN (${doctors.map(() => '?').join(',')})`)
      params.push(...doctors)
    }
    if (statuses.length) {
      conditions.push(`status IN (${statuses.map(() => '?').join(',')})`)
      params.push(...statuses)
    }
    if (from) {
      conditions.push('date >= ?')
      params.push(from)
    }
    if (to) {
      conditions.push('date <= ?')
      params.push(to)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const sql = `SELECT * FROM bookings ${where} ORDER BY date ASC`
    const stmt = c.env.DB.prepare(sql)

    const { results } = params.length > 0
      ? await stmt.bind(...params).all()
      : await stmt.all()

    return c.json(results)
  } catch (e: any) {
    console.error('❌ /api/bookings/export ล้มเหลว:', e)
    return c.json(
      { error: 'Export failed', detail: String(e?.message || e) },
      500
    )
  }
})

// 📍 Endpoint ใหม่: ดึงคิวเดี่ยวมาเช็คสิทธิ์ (ใช้ตอนกดแก้ไขคิว)
app.get('/api/bookings/:id', async (c) => {
  const id = c.req.param('id')
  const requester = c.get('user')

  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).all()
    if (results.length === 0) return c.json({ error: 'ไม่พบคิวนี้ในระบบ' }, 404)
    
    const booking = results[0]
    if (booking.doctorLicense !== requester.license && !hasAdminAccess(requester.role)) {
      return c.json({ error: 'Forbidden: คุณไม่มีสิทธิ์เข้าถึงคิวนี้' }, 403)
    }
    
    return c.json(booking)
  } catch (e) {
    return c.json({ error: 'DB Fetch Error' }, 500)
  }
})

app.post('/api/bookings', async (c) => {
  const b = await c.req.json()
  const requester = c.get('user')

  if (b.doctorLicense && b.doctorLicense !== requester.license && !hasAdminAccess(requester.role)) {
    return c.json({ error: 'ไม่มีสิทธิ์จองคิวแทนแพทย์ท่านอื่น' }, 403)
  }

  const doctorLicense = b.doctorLicense || requester.license

  try {
    // 📍 เพิ่มการเก็บฟิลด์ durationMinutes
    await c.env.DB.prepare(`
      INSERT INTO bookings (
        hn, fullName, dob, age, gender, procedure, durationMinutes, date, underlying, diagnosis, 
        cxrDate, cxrNote, ecgDate, ecgNote, labDate, labNote, admDate, admNote, 
        notes, status, room, doctorLicense, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))
    `).bind(
      b.hn, b.fullName, b.dob, b.age, b.gender, b.procedure, b.durationMinutes || 0,
      b.date, b.underlying, b.diagnosis, 
      b.cxrDate, b.cxrNote, b.ecgDate, b.ecgNote, b.labDate, b.labNote, b.admDate, b.admNote, 
      b.notes, 'Upcoming', b.room || 'OR-01', doctorLicense
    ).run()

    if (b.hn && b.fullName) {
      await c.env.DB.prepare(`
        INSERT INTO patients (hn, fullName, dob, gender, underlying, updatedAt)
        VALUES (?, ?, ?, ?, ?, datetime('now', '+7 hours'))
        ON CONFLICT(hn) DO UPDATE SET
          fullName = excluded.fullName,
          dob = excluded.dob,
          gender = excluded.gender,
          underlying = excluded.underlying,
          updatedAt = excluded.updatedAt
      `).bind(b.hn, b.fullName, b.dob ?? null, b.gender ?? null, b.underlying ?? null).run()
    }

    return c.json({ success: true }, 201)
  } catch (e) {
    console.error("DB Insert Error:", e)
    return c.json({ error: 'DB Insert Error' }, 500)
  }
})

app.put('/api/bookings/reorder', async (c) => {
  const requester = c.get('user')
  const { updates } = await c.req.json()

  if (!Array.isArray(updates) || updates.length === 0) {
    return c.json({ error: 'ไม่มีรายการที่ต้องจัดลำดับ' }, 400)
  }

  try {
    if (!hasAdminAccess(requester.role)) {
      const ids = updates.map((u: any) => u.id)
      const placeholders = ids.map(() => '?').join(',')

      const { results } = await c.env.DB
        .prepare(`SELECT id, doctorLicense FROM bookings WHERE id IN (${placeholders})`)
        .bind(...ids)
        .all<{ id: number; doctorLicense: string }>()

      if (results.length !== ids.length) {
        return c.json({ error: 'มีคิวที่ไม่พบในระบบ' }, 404)
      }
      if (results.some((row) => row.doctorLicense !== requester.license)) {
        return c.json({ error: 'ไม่มีสิทธิ์จัดลำดับคิวของแพทย์ท่านอื่น' }, 403)
      }
    }

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

app.put('/api/bookings/:id', async (c) => {
  const id = c.req.param('id')
  const b = await c.req.json()
  
  try {
    const existing = await c.env.DB.prepare('SELECT id, doctorLicense FROM bookings WHERE id = ?').bind(id).first()
    if (!existing) return c.json({ error: 'ไม่พบคิวนี้ในระบบ' }, 404)

    const requester = c.get('user')
    if (existing.doctorLicense !== requester.license && !hasAdminAccess(requester.role)) {
      return c.json({ error: 'ไม่มีสิทธิ์แก้ไขคิวนี้' }, 403)
    }

    // 📍 เพิ่มการเก็บฟิลด์ durationMinutes
    await c.env.DB.prepare(`
      UPDATE bookings SET
        hn = ?, fullName = ?, age = ?, gender = ?, procedure = ?, durationMinutes = ?, date = ?, room = ?, underlying = ?, diagnosis = ?,
        cxrDate = ?, cxrNote = ?, ecgDate = ?, ecgNote = ?, labDate = ?, labNote = ?, admDate = ?, admNote = ?,
        notes = ?
      WHERE id = ?
    `).bind(
      b.hn, b.fullName, b.age, b.gender, b.procedure, b.durationMinutes || 0, b.date, b.room || 'OR-01', b.underlying, b.diagnosis,
      b.cxrDate, b.cxrNote, b.ecgDate, b.ecgNote, b.labDate, b.labNote, b.admDate, b.admNote,
      b.notes, id
    ).run()

    if (b.hn && b.fullName) {
      await c.env.DB.prepare(`
        INSERT INTO patients (hn, fullName, dob, gender, underlying, updatedAt)
        VALUES (?, ?, ?, ?, ?, datetime('now', '+7 hours'))
        ON CONFLICT(hn) DO UPDATE SET
          fullName = excluded.fullName,
          dob = excluded.dob,
          gender = excluded.gender,
          underlying = excluded.underlying,
          updatedAt = excluded.updatedAt
      `).bind(b.hn, b.fullName, b.dob ?? null, b.gender ?? null, b.underlying ?? null).run()
    }

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

    const requester = c.get('user')
    if (existing.doctorLicense !== requester.license && !hasAdminAccess(requester.role)) {
      return c.json({ error: 'ไม่มีสิทธิ์เปลี่ยนสถานะคิวนี้' }, 403)
    }

    await c.env.DB.prepare('UPDATE bookings SET status = ? WHERE id = ?').bind(status, id).run()
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Update Failed' }, 500)
  }
})

app.get('/api/patients/:hn', async (c) => {
  const hn = c.req.param('hn')
  try {
    let patient = await c.env.DB.prepare(`
      SELECT hn, fullName, dob, gender, underlying 
      FROM patients WHERE hn = ?
    `).bind(hn).first()

    if (!patient) {
      patient = await c.env.DB.prepare(`
        SELECT hn, fullName, dob, gender, underlying 
        FROM bookings WHERE hn = ? ORDER BY createdAt DESC LIMIT 1
      `).bind(hn).first()
    }
    
    if (patient) return c.json(patient)
    return c.json({ error: 'ไม่พบผู้ป่วย' }, 404)
  } catch (e) {
    return c.json({ error: 'DB Fetch Error' }, 500)
  }
})


// ==========================================
// 📅 5. HOLIDAYS
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