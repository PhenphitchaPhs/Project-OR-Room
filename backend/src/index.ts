import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign, verify } from 'hono/jwt'
import bcrypt from 'bcryptjs' // 📍 เพิ่มตัวเข้ารหัสไว้บนสุด

// 📍 อัปเดต Bindings ให้รองรับคีย์ของ EmailJS แทน Resend
type Bindings = {
  DB: D1Database
  EMAILJS_SERVICE_ID: string
  EMAILJS_TEMPLATE_ID: string
  EMAILJS_PUBLIC_KEY: string
  EMAILJS_PRIVATE_KEY: string
  HOLIDAY_API_KEY: string
  /**
   * 🔑 กุญแจสำหรับเซ็นและตรวจ JWT
   * ตั้งด้วย `wrangler secret put JWT_SECRET` เท่านั้น
   * ห้าม commit ลง repo หรือใส่ใน wrangler.toml เด็ดขาด
   */
  JWT_SECRET: string
}

/** ข้อมูลตัวตนที่แกะจาก token แล้ว ใช้แทน x-user-license เดิมทั้งหมด */
type AuthUser = {
  license: string
  role: string
}

type Variables = {
  user: AuthUser
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/**
 * 🌐 CORS
 * ------------------------------------------------------------------
 * เดิมเปิด origin: '*' ซึ่งแปลว่าเว็บไหนก็เรียก API นี้จากเบราว์เซอร์ผู้ใช้ได้
 * เปลี่ยนเป็น allowlist เฉพาะโดเมนที่เป็นของระบบจริง
 *
 * ⚠️ ถ้ามีโดเมน preview ของ Vercel ที่ต้องใช้ ให้เพิ่มในลิสต์นี้
 *    (Vercel preview จะเป็น project-or-room-<hash>-<team>.vercel.app ซึ่งเดาล่วงหน้าไม่ได้
 *     ถ้าต้องใช้บ่อยค่อยเปลี่ยนเป็นตรวจด้วย regex ทีหลัง)
 */
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

/**
 * อายุ token 8 ชั่วโมง — ครอบคลุมกะทำงานหนึ่งกะพอดี หมดแล้วให้ login ใหม่
 * เลือกแบบไม่มี refresh token เพราะยังไม่คุ้มกับความซับซ้อนที่ต้องเพิ่ม
 * (ตาราง refresh_tokens, endpoint ต่ออายุ, การกัน race ตอน refresh พร้อมกันหลาย tab)
 */
const TOKEN_TTL_SECONDS = 8 * 60 * 60

/**
 * ⚠️ ต้องระบุ alg ให้ชัดทั้งตอน sign และ verify
 *    hono ตั้งแต่ v4.11 บังคับให้ verify ระบุ alg เอง ถ้าไม่ระบุจะ throw
 *    และการระบุให้ชัดยังกันการโจมตีแบบสลับ alg (เช่นยัด alg: none หรือสลับไป RS256) ด้วย
 */
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

/**
 * ตรวจ token ทุก request ที่ไม่ใช่ route สาธารณะ
 *
 * 📌 ตัวตนและ role มาจาก payload ที่ verify ลายเซ็นแล้วเท่านั้น
 *    ไม่มีการอ่าน header ที่ client ตั้งค่าเองได้อีกต่อไป
 */
const authMiddleware = async (c: any, next: any) => {
  if (!c.env.JWT_SECRET) {
    // ตั้ง secret ไม่ครบถือว่าระบบยังไม่พร้อม ปฏิเสธไปเลยดีกว่าปล่อยผ่านแบบไม่มีการตรวจ
    console.error('❌ ไม่ได้ตั้ง JWT_SECRET — ปฏิเสธทุก request ที่ต้องยืนยันตัวตน')
    return c.json({ error: 'เซิร์ฟเวอร์ตั้งค่าไม่ครบ กรุณาติดต่อผู้ดูแลระบบ' }, 500)
  }

  const header = c.req.header('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''

  if (!token) {
    return c.json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, 401)
  }

  try {
    // verify โยน error ทั้งกรณีลายเซ็นไม่ตรงและกรณี exp เลยเวลาแล้ว
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

/** ใช้ต่อจาก authMiddleware สำหรับ route ที่เฉพาะ admin เท่านั้น */
const requireAdmin = async (c: any, next: any) => {
  const user = c.get('user') as AuthUser | undefined
  if (!hasAdminAccess(user?.role)) {
    return c.json({ error: 'ต้องมีสิทธิ์แอดมินจึงจะใช้งานส่วนนี้ได้' }, 403)
  }
  await next()
}

/**
 * 🔓 Route สาธารณะ — ไม่ต้องมี token
 * นอกเหนือจากนี้ต้องผ่าน authMiddleware ทั้งหมด
 * เพิ่ม route ใหม่แล้วไม่ต้องทำอะไร มันจะถูกบังคับ auth ให้เองโดยอัตโนมัติ
 */
const PUBLIC_PATHS = [
  '/api/login',
  '/api/register',
  '/api/send-otp',
  '/api/forgot-password',
  '/api/reset-password',
  '/api/holidays',
]

app.use('/api/*', async (c, next) => {
  // preflight ต้องผ่านก่อนเสมอ ไม่งั้นเบราว์เซอร์จะเห็นเป็น CORS error แทน 401
  if (c.req.method === 'OPTIONS') return next()
  if (PUBLIC_PATHS.includes(new URL(c.req.url).pathname)) return next()
  return authMiddleware(c, next)
})


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

    // 🔒 ไม่ส่ง password hash และ reset token กลับไปให้ client
    //    ของเดิมส่ง user ทั้งแถวซึ่งมีสองอย่างนี้ติดไปด้วย
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

  // 🛡️ กัน privilege escalation — แก้ role ของตัวเองไม่ได้ ต้องให้ admin คนอื่นแก้ให้
  //    ไม่งั้นบัญชีที่หลุดมือไปหนึ่งบัญชีจะยกตัวเองขึ้น ๆ ลง ๆ ได้ตามใจ
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

app.get('/api/bookings', async (c) => {
  const license = c.req.query('license')
  const requester = c.get('user')

  // 🛡️ กันการดึง (และ export) ข้อมูลของแพทย์ท่านอื่น
  // ขอเจาะจง license ที่ไม่ใช่ของตัวเอง ต้องเป็น admin เท่านั้นจึงผ่าน
  if (license && license !== requester.license && !hasAdminAccess(requester.role)) {
    return c.json({ error: 'ไม่มีสิทธิ์เข้าถึงข้อมูลการจองของแพทย์ท่านอื่น' }, 403)
  }

  // ⚠️ ไม่ระบุ license = ได้คิวทั้งระบบ ซึ่งหน้า Calendar และ Booking ฝั่ง user ยังต้องใช้
  //    เพื่อเช็คว่าห้องและเวลาชนกับของแพทย์ท่านอื่นหรือไม่
  //    ตอนนี้จึงยังจำกัดให้เห็นเฉพาะของตัวเองไม่ได้ ต้องแยก endpoint เช็คคิวชนออกมาก่อน
  //    (ดู issue เรื่องแยก endpoint เช็คคิวชน) แล้วค่อยล็อกตรงนี้ให้แคบลง
  try {
    const { results } = license
      ? await c.env.DB.prepare('SELECT * FROM bookings WHERE doctorLicense = ? ORDER BY date ASC').bind(license).all()
      : await c.env.DB.prepare('SELECT * FROM bookings ORDER BY date ASC').all()
    return c.json(results)
  } catch (e) {
    return c.json({ error: 'DB Fetch Error' }, 500)
  }
})

// ==========================================
// 📤 Export รายการจองทั้งระบบ (เฉพาะ admin)
// แยก endpoint ออกมาเพื่อบังคับสิทธิ์ได้เต็มที่
// โดยไม่กระทบ GET /api/bookings ที่หน้า Calendar / Booking ฝั่ง user ยังต้องใช้
// ==========================================
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

    // ใช้ placeholder ตามจำนวนสมาชิกจริง ค่าทุกตัว bind เข้าไป ไม่ต่อ string เอง
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

    // 📌 เรียงแค่ date เหมือน GET /api/bookings เดิม เพื่อไม่ให้พึ่งคอลัมน์ที่ฐานข้อมูลจริงอาจยังไม่มี
    //    (การเรียงตามห้อง/ลำดับคิว ทำต่อที่ฝั่ง frontend ใน sortForExport อยู่แล้ว)
    const sql = `SELECT * FROM bookings ${where} ORDER BY date ASC`
    const stmt = c.env.DB.prepare(sql)

    // ไม่เรียก .bind() ตอนไม่มีพารามิเตอร์ กัน D1 บางเวอร์ชันโวยเรื่องจำนวน binding
    const { results } = params.length > 0
      ? await stmt.bind(...params).all()
      : await stmt.all()

    return c.json(results)
  } catch (e: any) {
    // ⚠️ ส่งข้อความจริงกลับไปด้วย จะได้รู้ว่าพังเพราะอะไร
    //    เมื่อแก้เสร็จแล้วควรเอา detail ออก ไม่ให้ข้อมูลภายในหลุดไปหา client
    console.error('❌ /api/bookings/export ล้มเหลว:', e)
    return c.json(
      { error: 'Export failed', detail: String(e?.message || e) },
      500
    )
  }
})

app.post('/api/bookings', async (c) => {
  const b = await c.req.json()
  const requester = c.get('user')

  if (b.doctorLicense && b.doctorLicense !== requester.license && !hasAdminAccess(requester.role)) {
    return c.json({ error: 'ไม่มีสิทธิ์จองคิวแทนแพทย์ท่านอื่น' }, 403)
  }

  // ไม่ส่ง doctorLicense มาก็ถือว่าจองในนามตัวเอง กันเคสที่เดิมบันทึกเป็น null แล้วคิวไม่มีเจ้าของ
  const doctorLicense = b.doctorLicense || requester.license

  try {
    await c.env.DB.prepare(`
      INSERT INTO bookings (
        hn, fullName, dob, age, gender, procedure, date, underlying, diagnosis, 
        cxrDate, cxrNote, ecgDate, ecgNote, labDate, labNote, admDate, admNote, 
        notes, status, room, doctorLicense, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))
    `).bind(
      b.hn, b.fullName, b.dob, b.age, b.gender, b.procedure, 
      b.date, b.underlying, b.diagnosis, 
      b.cxrDate, b.cxrNote, b.ecgDate, b.ecgNote, b.labDate, b.labNote, b.admDate, b.admNote, 
      b.notes, 'Upcoming', b.room || 'OR-01', doctorLicense
    ).run()

    // 📍 บันทึก/อัปเดตข้อมูลผู้ป่วยลงตาราง patients (แยกจากตารางการจอง)
    //    ทำให้ลบรายการจองได้โดยข้อมูลผู้ป่วยยังคงอยู่
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

/**
 * ⚠️ ต้องประกาศก่อน PUT /api/bookings/:id เสมอ
 * hono จับคู่ route ตามลำดับที่ประกาศ ถ้า /:id มาก่อน คำขอ /api/bookings/reorder
 * จะถูกจับเป็น id = "reorder" แล้วตกไปที่ handler แก้ไขคิวแทน ซึ่งหาไม่เจอและคืน 404
 * (บั๊กนี้มีมาก่อนหน้านี้ ทำให้การลากจัดลำดับคิวไม่เคยถูกบันทึกลงฐานข้อมูลจริง)
 */
app.put('/api/bookings/reorder', async (c) => {
  const requester = c.get('user')
  const { updates } = await c.req.json()

  if (!Array.isArray(updates) || updates.length === 0) {
    return c.json({ error: 'ไม่มีรายการที่ต้องจัดลำดับ' }, 400)
  }

  try {
    // 🛡️ ตรวจความเป็นเจ้าของทุกคิวก่อนเขียน ไม่งั้นแพทย์คนหนึ่งสลับลำดับคิวของอีกคนได้
    //    ของเดิมเช็คแค่ว่า "มี role อะไรสักอย่าง" ซึ่งผ่านหมดทุกคนที่ login อยู่
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

// 🔒 ก่อนหน้านี้ endpoint นี้ไม่มีการตรวจสิทธิ์เลย ใครรู้ HN ก็ดึงข้อมูลผู้ป่วยได้
//    ตอนนี้ถูกบังคับ auth โดย middleware ที่ครอบ /api/* ไว้แล้ว

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

    await c.env.DB.prepare(`
      UPDATE bookings SET
        hn = ?, fullName = ?, age = ?, gender = ?, procedure = ?, date = ?, room = ?, underlying = ?, diagnosis = ?,
        cxrDate = ?, cxrNote = ?, ecgDate = ?, ecgNote = ?, labDate = ?, labNote = ?, admDate = ?, admNote = ?,
        notes = ?
      WHERE id = ?
    `).bind(
      b.hn, b.fullName, b.age, b.gender, b.procedure, b.date, b.room || 'OR-01', b.underlying, b.diagnosis,
      b.cxrDate, b.cxrNote, b.ecgDate, b.ecgNote, b.labDate, b.labNote, b.admDate, b.admNote,
      b.notes, id
    ).run()

    // 📍 บันทึก/อัปเดตข้อมูลผู้ป่วยลงตาราง patients (แยกจากตารางการจอง)
    //    ทำให้ลบรายการจองได้โดยข้อมูลผู้ป่วยยังคงอยู่
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
    // 📍 อ่านจากตาราง patients เป็นหลัก ถ้าไม่พบจึงย้อนไปหาในตาราง bookings (ข้อมูลเก่าก่อน migrate)
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