import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign, verify } from 'hono/jwt'
import bcrypt from 'bcryptjs'
import { getProcedureDuration } from './procedureDurations.js'

type Bindings = {
  DB: D1Database
  EMAILJS_SERVICE_ID: string
  EMAILJS_TEMPLATE_ID: string
  EMAILJS_PUBLIC_KEY: string
  EMAILJS_PRIVATE_KEY: string
  BREVO_API_KEY: string
  BREVO_SENDER_EMAIL: string
  BREVO_SENDER_NAME?: string
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

type TomorrowBooking = {
  id: number
  hn: string
  fullName: string
  procedure: string | null
  date: string
  room: string | null
  queueOrder: number | null
  durationMinutes: number | null
  doctorLicense: string | null
  email: string
  doctorName: string
}

const getDateInBangkok = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)

const getTomorrowInBangkok = () => {
  const bangkokToday = getDateInBangkok()
  const [year, month, day] = bangkokToday.split('-').map(Number)
  return getDateInBangkok(new Date(Date.UTC(year, month - 1, day + 1, 12)))
}

const ensureNotificationLogsTable = async (db: D1Database) => {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS notification_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notificationType TEXT NOT NULL,
      targetDate TEXT NOT NULL,
      doctorLicense TEXT NOT NULL,
      email TEXT,
      status TEXT NOT NULL,
      bookingCount INTEGER NOT NULL DEFAULT 0,
      errorMessage TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run()
}

const formatBookingDetails = (bookings: TomorrowBooking[]) =>
  bookings.map((booking, index) => [
    `${index + 1}. ${booking.fullName || '-'}`,
    `HN: ${booking.hn || '-'}`,
    `Procedure: ${booking.procedure || '-'}`,
    `Room: ${booking.room || '-'}`,
    `Time/Queue: ${booking.queueOrder ?? '-'}`,
    `Duration: ${booking.durationMinutes || 0} minutes`,
  ].join(' | ')).join('\n')

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character] || character))

const formatBookingDetailsHtml = (bookings: TomorrowBooking[]) =>
  bookings.map((booking, index) => `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #e5e7eb;vertical-align:top;">
        <div style="font-size:16px;font-weight:700;color:#001f5b;margin-bottom:10px;">
          <span style="display:inline-block;background:#1a3a7c;color:#ffffff;border-radius:999px;padding:3px 9px;font-size:12px;margin-right:7px;">#${index + 1}</span>
          ${escapeHtml(booking.fullName || '-')}
        </div>
        <table role="presentation" style="width:100%;font-size:13px;color:#4a6fa5;">
          <tr><td style="padding:3px 0;width:105px;"><strong>HN</strong></td><td style="padding:3px 0;">${escapeHtml(booking.hn || '-')}</td></tr>
          <tr><td style="padding:3px 0;"><strong>Procedure</strong></td><td style="padding:3px 0;">${escapeHtml(booking.procedure || '-')}</td></tr>
          <tr><td style="padding:3px 0;"><strong>Room</strong></td><td style="padding:3px 0;">${escapeHtml(booking.room || '-')}</td></tr>
          <tr><td style="padding:3px 0;"><strong>Queue / time</strong></td><td style="padding:3px 0;">${booking.queueOrder ?? '-'}</td></tr>
          <tr><td style="padding:3px 0;"><strong>Duration</strong></td><td style="padding:3px 0;">${booking.durationMinutes || 0} minutes</td></tr>
        </table>
      </td>
    </tr>
  `).join('')

const sendTomorrowNotifications = async (
  env: Bindings,
  force = false,
  emailFilter?: string,
) => {
  const targetDate = getTomorrowInBangkok()

  await ensureNotificationLogsTable(env.DB)

  const emailCondition = emailFilter
    ? ' AND LOWER(TRIM(u.email)) = LOWER(TRIM(?))'
    : ''
  const queryParams = emailFilter ? [targetDate, emailFilter] : [targetDate]
  const { results } = await env.DB.prepare(`
    SELECT b.id, b.hn, b.fullName, b.procedure, b.date, b.room, b.queueOrder,
      b.durationMinutes, b.doctorLicense, u.email, u.doctorName
    FROM bookings b
    INNER JOIN users u ON b.doctorLicense = u.license
    WHERE b.date = ?
      AND b.status NOT IN ('Cancelled', 'Completed', 'Succeed')
      AND u.email IS NOT NULL AND TRIM(u.email) != ''
      ${emailCondition}
    ORDER BY b.doctorLicense, b.queueOrder ASC, b.id ASC
  `).bind(...queryParams).all<TomorrowBooking>()

  const grouped = new Map<string, TomorrowBooking[]>()
  for (const booking of results) {
    const key = booking.doctorLicense || booking.email
    const current = grouped.get(key) || []
    current.push(booking)
    grouped.set(key, current)
  }

  const summary = { targetDate, doctors: grouped.size, sent: 0, skipped: 0, failed: 0 }

  for (const [doctorLicense, bookings] of grouped) {
    const email = bookings[0].email
    const previous = await env.DB.prepare(`
      SELECT id FROM notification_logs
      WHERE notificationType = 'tomorrow-surgery'
        AND targetDate = ? AND doctorLicense = ? AND status = 'sent'
      LIMIT 1
    `).bind(targetDate, doctorLicense).first()

    if (previous && !force) {
      summary.skipped++
      console.log(JSON.stringify({ event: 'tomorrow-notification', targetDate, doctorLicense, email, status: 'skipped', reason: 'already-sent' }))
      continue
    }

    try {
      const bookingDetails = formatBookingDetails(bookings)
      const subject = `Surgery queue for ${targetDate}`
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': env.BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: {
            email: env.BREVO_SENDER_EMAIL,
            name: env.BREVO_SENDER_NAME || 'OR Room',
          },
          to: [{ email, name: bookings[0].doctorName }],
          subject,
          textContent: [
            `Dear ${bookings[0].doctorName || 'Doctor'},`,
            `Surgery queue for ${targetDate} (${bookings.length} case(s))`,
            '',
            bookingDetails,
          ].join('\n'),
          htmlContent: `<!doctype html>
            <html>
              <body style="margin:0;background:#f4f7fb;font-family:Arial,'Segoe UI',sans-serif;color:#1a3a5f;">
                <div style="max-width:680px;margin:0 auto;padding:24px 12px;">
                  <div style="background:#001f5b;border-radius:16px 16px 0 0;padding:28px 24px;color:#ffffff;border-bottom:5px solid #4a6fa5;">
                    <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#cce0ff;">ORchestrator</div>
                    <h1 style="font-size:25px;line-height:1.25;margin:8px 0 6px;">Surgery Queue</h1>
                    <div style="font-size:15px;color:#e8f0fe;">Tomorrow · ${targetDate}</div>
                  </div>
                  <div style="background:#ffffff;padding:24px;border-radius:0 0 16px 16px;border:1px solid #d6e2f1;border-top:0;box-shadow:0 4px 18px rgba(0,31,91,.08);">
                    <p style="font-size:16px;margin:0 0 6px;">Dear <strong>${escapeHtml(bookings[0].doctorName || 'Doctor')}</strong>,</p>
                    <p style="color:#4a6fa5;margin:0 0 18px;">You have <strong style="color:#001f5b;">${bookings.length} surgery case(s)</strong> scheduled for tomorrow.</p>
                    <div style="background:#f0f7ff;border:1px solid #cce0ff;border-radius:10px;padding:12px 14px;margin-bottom:8px;font-size:13px;color:#1a3a7c;">
                      Please review the queue details below and prepare accordingly.
                    </div>
                    <table role="presentation" style="width:100%;border-collapse:collapse;">${formatBookingDetailsHtml(bookings)}</table>
                    <p style="font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;margin:18px 0 0;">
                      This is an automated notification from ORchestrator. Please contact the operating room team if any detail needs to be changed.
                    </p>
                  </div>
                </div>
              </body>
            </html>`,
        }),
      })

      if (!response.ok) throw new Error(await response.text())

      await env.DB.prepare(`
        INSERT INTO notification_logs
          (notificationType, targetDate, doctorLicense, email, status, bookingCount)
        VALUES (?, ?, ?, ?, 'sent', ?)
      `).bind('tomorrow-surgery', targetDate, doctorLicense, email, bookings.length).run()

      summary.sent++
      console.log(JSON.stringify({ event: 'tomorrow-notification', targetDate, doctorLicense, email, bookingCount: bookings.length, status: 'sent' }))
    } catch (error) {
      const errorMessage = String(error instanceof Error ? error.message : error)
      await env.DB.prepare(`
        INSERT INTO notification_logs
          (notificationType, targetDate, doctorLicense, email, status, bookingCount, errorMessage)
        VALUES (?, ?, ?, ?, 'failed', ?, ?)
      `).bind('tomorrow-surgery', targetDate, doctorLicense, email, bookings.length, errorMessage.slice(0, 1000)).run()
      summary.failed++
      console.error(JSON.stringify({ event: 'tomorrow-notification', targetDate, doctorLicense, email, bookingCount: bookings.length, status: 'failed', error: errorMessage }))
    }
  }

  return summary
}

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

const ADMIN_ROLES = ['admin']

const normalizeRole = (role: string | null | undefined) =>
  (role ?? '').toString().trim().toLowerCase().replace(/[\s-]+/g, '_')

const hasAdminAccess = (role: string | null | undefined) => {
  const r = normalizeRole(role)
  return ADMIN_ROLES.includes(r) || r.includes('admin')
}

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
    return c.json({ error: 'Server configuration is incomplete. Please contact an administrator' }, 500)
  }

  const header = c.req.header('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''

  if (!token) {
    return c.json({ error: 'Please log in before using this feature' }, 401)
  }

  try {
    const payload = await verify(token, c.env.JWT_SECRET, JWT_ALG)

    if (!payload?.license) {
      return c.json({ error: 'Invalid token. Please log in again' }, 401)
    }

    c.set('user', {
      license: String(payload.license),
      role: String(payload.role || 'user'),
    })

    await next()
  } catch (e) {
    return c.json({ error: 'Your session has expired. Please log in again' }, 401)
  }
}

const requireAdmin = async (c: any, next: any) => {
  const user = c.get('user') as AuthUser | undefined
  if (!hasAdminAccess(user?.role)) {
    return c.json({ error: 'Admin privileges are required for this feature' }, 403)
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

app.post('/api/send-otp', async (c) => {
  try {
    const { email } = await c.req.json()
    if (!email) return c.json({ error: 'Please provide an email address' }, 400)

    const existingUser = await c.env.DB.prepare('SELECT email FROM users WHERE email = ?').bind(email).first()
    if (existingUser) return c.json({ error: 'This email is already in use' }, 400)

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

    return c.json({ success: true, message: 'Verification code sent to your email' })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Unable to send the email. Please try again.' }, 500)
  }
})

app.post('/api/register', async (c) => {
  try {
    const { license, doctorName, email, password, orNumber, otp } = await c.req.json()

    if (!license || !doctorName || !email || !password || !orNumber || !otp) {
      return c.json({ error: 'Please complete all required fields' }, 400)
    }

    const otpRecord = await c.env.DB.prepare('SELECT * FROM otps WHERE email = ?').bind(email).first()
    if (!otpRecord || String(otpRecord.otp) !== String(otp)) {
      return c.json({ error: 'Invalid OTP or no OTP has been requested' }, 400)
    }
    if (Date.now() > Number(otpRecord.expiry)) {
      return c.json({ error: 'The OTP has expired. Please request a new one' }, 400)
    }

    const existingUser = await c.env.DB.prepare('SELECT * FROM users WHERE license = ? OR email = ?').bind(license, email).first()
    if (existingUser) return c.json({ error: 'This license or email is already in use' }, 400)

    const hashedPassword = bcrypt.hashSync(password, 10)
    await c.env.DB.prepare(`
      INSERT INTO users (license, doctorName, email, password, orNumber, role)
      VALUES (?, ?, ?, ?, ?, 'user')
    `).bind(license, doctorName, email, hashedPassword, orNumber).run()

    await c.env.DB.prepare('DELETE FROM otps WHERE email = ?').bind(email).run()

    return c.json({ success: true, message: 'Registration successful' }, 201)
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Registration failed' }, 500)
  }
})

app.post('/api/login', async (c) => {
  try {
    const { email, password, license } = await c.req.json()
    const identifier = email ?? license
    if (!identifier) return c.json({ error: 'Please enter your email/license and password' }, 400)

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? OR license = ?').bind(identifier, identifier).first()
    if (!user) {
      return c.json({ error: 'Invalid email/license or password' }, 401)
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
      return c.json({ error: 'Invalid email/license or password' }, 401)
    }

    if (!c.env.JWT_SECRET) {
      console.error('❌ ไม่ได้ตั้ง JWT_SECRET — ออก token ไม่ได้')
      return c.json({ error: 'Server configuration is incomplete. Please contact an administrator' }, 500)
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
    return c.json({ error: 'Login failed' }, 500)
  }
})

app.post('/api/forgot-password', async (c) => {
  const { email } = await c.req.json()
  try {
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
    if (!user) return c.json({ error: 'Email not found' }, 404)

    const token = crypto.randomUUID()
    const expiry = Date.now() + 3600000

    await c.env.DB.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?').bind(token, expiry, email).run()

    const resetLink = `https://project-or-room.vercel.app/newpassword?token=${token}`

    return c.json({ success: true, resetLink, message: 'Password reset link created successfully' })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'System error' }, 500)
  }
})

app.post('/api/reset-password', async (c) => {
  try {
    const { token, newPassword } = await c.req.json()
    if (!token || !newPassword) {
      return c.json({ error: 'Incomplete data' }, 400)
    }

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE reset_token = ?').bind(token).first()
    if (!user) return c.json({ error: 'Invalid or already used password reset link' }, 400)

    const expiry = Number(user.reset_token_expiry)
    if (!expiry || Date.now() > expiry) {
      return c.json({ error: 'The password reset link has expired. Please request a new one' }, 400)
    }

    const hashedNewPassword = bcrypt.hashSync(newPassword, 10)

    await c.env.DB.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE reset_token = ?')
      .bind(hashedNewPassword, token).run()

    return c.json({ success: true, message: 'Password reset successfully' })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Password reset failed' }, 500)
  }
})

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
    return c.json({ error: 'User not found' }, 404)
  } catch (e) {
    return c.json({ error: 'DB Fetch Error' }, 500)
  }
})

app.put('/api/users/:license/or-number', async (c) => {
  const { orNumber } = await c.req.json()
  const license = c.req.param('license')

  const requester = c.get('user')
  if (requester.license !== license && !hasAdminAccess(requester.role)) {
    return c.json({ error: 'You do not have permission to edit this account' }, 403)
  }

  try {
    const info = await c.env.DB.prepare('UPDATE users SET orNumber = ? WHERE license = ?').bind(orNumber, license).run()
    if (info.meta.changes === 0) return c.json({ error: `License '${license}' was not found` }, 404)
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
    if (info.meta.changes === 0) return c.json({ error: `License '${license}' was not found` }, 404)
    return c.json({ success: true, message: `Role changed to '${newRole}' successfully` })
  } catch (e) {
    return c.json({ error: 'Update Role Failed' }, 500)
  }
})

app.delete('/api/users/:license', requireAdmin, async (c) => {
  const license = c.req.param('license')

  if (c.get('user').license === license) {
    return c.json({ error: 'You cannot delete your own account' }, 403)
  }

  try {
    const user = await c.env.DB.prepare('SELECT role FROM users WHERE license = ?').bind(license).first()
    if (!user) return c.json({ error: 'Account not found' }, 404)
    if (user.role === 'admin') return c.json({ error: 'Admin accounts cannot be deleted' }, 403)

    await c.env.DB.prepare('DELETE FROM users WHERE license = ?').bind(license).run()
    return c.json({ success: true, message: 'Account deleted successfully (patient data was preserved)' })
  } catch (e) {
    return c.json({ error: 'Delete operation failed' }, 500)
  }
})

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

  if (typeof b.hn !== 'string' || !/^\d{7}$/.test(b.hn)) {
    return c.json({ error: 'HN must contain exactly 7 digits' }, 400)
  }

  if (b.doctorLicense && b.doctorLicense !== requester.license && !hasAdminAccess(requester.role)) {
    return c.json({ error: 'ไม่มีสิทธิ์จองคิวแทนแพทย์ท่านอื่น' }, 403)
  }

  const doctorLicense = b.doctorLicense || requester.license
  let durationMinutes: number

  try {
    durationMinutes = getProcedureDuration(b.procedure)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Invalid procedure' }, 400)
  }

  try {

    await c.env.DB.prepare(`
      INSERT INTO bookings (
        hn, fullName, dob, age, gender, procedure, durationMinutes, date, underlying, diagnosis,
        cxrDate, cxrNote, ecgDate, ecgNote, labDate, labNote, admDate, admNote,
        notes, status, room, doctorLicense, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))
    `).bind(
      b.hn, b.fullName, b.dob, b.age, b.gender, b.procedure, durationMinutes,
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

app.put('/api/bookings/:id', async (c) => {
  const id = c.req.param('id')
  const b = await c.req.json()

  if (typeof b.hn !== 'string' || !/^\d{7}$/.test(b.hn)) {
    return c.json({ error: 'HN must contain exactly 7 digits' }, 400)
  }

  try {
    const existing = await c.env.DB.prepare('SELECT id, doctorLicense FROM bookings WHERE id = ?').bind(id).first()
    if (!existing) return c.json({ error: 'ไม่พบคิวนี้ในระบบ' }, 404)

    const requester = c.get('user')
    if (existing.doctorLicense !== requester.license && !hasAdminAccess(requester.role)) {
      return c.json({ error: 'ไม่มีสิทธิ์แก้ไขคิวนี้' }, 403)
    }

    let durationMinutes: number
    try {
      durationMinutes = getProcedureDuration(b.procedure)
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : 'Invalid procedure' }, 400)
    }

    await c.env.DB.prepare(`
      UPDATE bookings SET
        hn = ?, fullName = ?, age = ?, gender = ?, procedure = ?, durationMinutes = ?, date = ?, room = ?, underlying = ?, diagnosis = ?,
        cxrDate = ?, cxrNote = ?, ecgDate = ?, ecgNote = ?, labDate = ?, labNote = ?, admDate = ?, admNote = ?,
        notes = ?
      WHERE id = ?
    `).bind(
      b.hn, b.fullName, b.age, b.gender, b.procedure, durationMinutes, b.date, b.room || 'OR-01', b.underlying, b.diagnosis,
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
  if (!/^\d{7}$/.test(hn)) return c.json({ error: 'HN must contain exactly 7 digits' }, 400)

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

app.post('/api/notify-tomorrow', requireAdmin, async (c) => {
  try {
    const emailFilter = c.req.query('email')?.trim()
    if (c.req.query('email') !== undefined && !emailFilter) {
      return c.json({ error: 'email must not be empty' }, 400)
    }

    const summary = await sendTomorrowNotifications(c.env, true, emailFilter)
    return c.json({ success: true, ...summary })
  } catch (error) {
    console.error('Tomorrow notification job failed:', error)
    return c.json({ error: 'Tomorrow notification job failed' }, 500)
  }
})

app.get('/api/notification-logs', requireAdmin, async (c) => {
  const limit = Math.min(Number(c.req.query('limit') || 50), 200)
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM notification_logs ORDER BY createdAt DESC LIMIT ?',
  ).bind(limit).all()
  return c.json(results)
})

const worker = {
  fetch: app.fetch,
  scheduled: async (
    _controller: ScheduledController,
    env: Bindings,
    ctx: ExecutionContext,
  ) => {
    ctx.waitUntil(sendTomorrowNotifications(env))
  },
}

export default worker
