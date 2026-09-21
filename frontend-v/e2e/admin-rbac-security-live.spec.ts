import {
  expect,
  request as apiRequest,
  test as base,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test'

type Booking = {
  id: number | string
  doctorLicense?: string
  hn?: string
  fullName?: string
  status?: string
}

type LoginUser = {
  license: string
  doctorName: string
  email?: string
  orNumber?: string | number
  role: string
}

type Account = {
  token: string
  user: LoginUser
  bookings: Booking[]
  state: Awaited<ReturnType<BrowserContext['storageState']>>
}

type Accounts = {
  admin: Account
  userA: Account
  userB: Account
}

const BASE_URL = 'https://project-or-room.vercel.app'
const ADMIN_ROUTES = [
  '/admin-home',
  '/admin-dashboard',
  '/admin-add-patient',
  '/admin-calendar',
  '/admin-procedures',
]
const USER_ROUTES = ['/home', '/calendar', '/booking', '/procedures']
const ADMIN_API_PATHS = new Set([
  '/api/users',
  '/api/bookings/export',
  '/api/procedures/audit-logs',
  '/api/notification-logs',
])

function storageState(token: string, user: LoginUser): Account['state'] {
  return {
    cookies: [],
    origins: [{
      origin: BASE_URL,
      localStorage: [
        { name: 'authToken', value: token },
        { name: 'isLoggedIn', value: 'true' },
        { name: 'userLicense', value: user.license },
        { name: 'doctorName', value: user.doctorName || '' },
        { name: 'userRole', value: user.role },
        { name: 'orNumber', value: String(user.orNumber || '') },
      ],
    }],
  }
}

async function login(
  request: APIRequestContext,
  identifier: string,
  password: string,
  expectedRole: 'admin' | 'user',
) {
  const response = await request.post('/api/login', {
    data: expectedRole === 'admin'
      ? { license: identifier, password }
      : { email: identifier, password },
  })
  expect(response.status(), `Login must succeed for ${identifier}`).toBe(200)
  const body = await response.json() as { token: string; user: LoginUser }
  expect(body.token).toBeTruthy()
  expect(body.user.role).toBe(expectedRole)

  const bookingsResponse = await request.get('/api/bookings', {
    headers: { Authorization: `Bearer ${body.token}` },
  })
  expect(bookingsResponse.status()).toBe(200)
  const bookings = await bookingsResponse.json() as Booking[]
  expect(Array.isArray(bookings)).toBe(true)

  return {
    token: body.token,
    user: body.user,
    bookings,
    state: storageState(body.token, body.user),
  }
}

const test = base.extend<Record<string, never>, { accounts: Accounts }>({
  accounts: [async ({}, use) => {
    const adminUsername = process.env.LIVE_ADMIN_USERNAME || 'admin007'
    const adminPassword = process.env.LIVE_ADMIN_PASSWORD
    const userAEmail = process.env.LIVE_USER_EMAIL
    const userAPassword = process.env.LIVE_USER_PASSWORD
    const userBEmail = process.env.LIVE_USER_B_EMAIL
    const userBPassword = process.env.LIVE_USER_B_PASSWORD || userAPassword

    if (!adminPassword) throw new Error('Set LIVE_ADMIN_PASSWORD locally before running RBAC tests.')
    if (!userAEmail || !userAPassword) {
      throw new Error('Set LIVE_USER_EMAIL and LIVE_USER_PASSWORD locally before running RBAC tests.')
    }
    if (!userBEmail || !userBPassword) {
      throw new Error('Set LIVE_USER_B_EMAIL and LIVE_USER_B_PASSWORD locally before running RBAC tests.')
    }

    const request = await apiRequest.newContext({ baseURL: BASE_URL })
    try {
      const [admin, userA, userB] = await Promise.all([
        login(request, adminUsername, adminPassword, 'admin'),
        login(request, userAEmail, userAPassword, 'user'),
        login(request, userBEmail, userBPassword, 'user'),
      ])
      expect(userA.user.license).not.toBe(userB.user.license)
      await use({ admin, userA, userB })
    } finally {
      await request.dispose()
    }
  }, { scope: 'worker' }],
})

async function expectRouteAccessible(page: Page, path: string) {
  await page.goto(path)
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))
  await expect(page.locator('body')).toBeVisible()
  await expect(page.locator('body')).not.toContainText('You do not have permission')
}

async function bookingsLoadedBy(page: Page, path: string) {
  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/bookings'
    && response.request().method() === 'GET')
  await page.goto(path)
  const response = await responsePromise
  expect(response.status()).toBe(200)
  return response.json() as Promise<Booking[]>
}

function safeErrorPayload(payload: unknown) {
  const text = JSON.stringify(payload)
  expect(text).not.toMatch(/fullName|doctorName|email|patient|hn/i)
}

function tamperToken(token: string) {
  const last = token.at(-1)
  return `${token.slice(0, -1)}${last === 'a' ? 'b' : 'a'}`
}

function coverageGap(description: string) {
  test.info().annotations.push({ type: 'coverage-gap', description })
}

test.describe('Role-based access control and system security — live backend', () => {
  test('TC-A08.1 เข้าใช้งานหน้าจอและข้อมูลตามบทบาท', async ({ browser, accounts }) => {
    const adminLicenses = new Set(accounts.admin.bookings.map((row) => row.doctorLicense))
    if (accounts.userA.bookings.length) {
      expect([...adminLicenses]).toContain(accounts.userA.user.license)
    } else {
      coverageGap('User A ไม่มีคิวในฐานข้อมูลจริง จึงยังไม่ได้ตรวจว่า Admin เห็นคิวของ User A')
    }
    if (accounts.userB.bookings.length) {
      expect([...adminLicenses]).toContain(accounts.userB.user.license)
    } else {
      coverageGap('User B ไม่มีคิวในฐานข้อมูลจริง จึงยังไม่ได้ตรวจว่า Admin เห็นคิวของ User B')
    }

    const admin = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.admin.state })
    try {
      const page = await admin.newPage()
      for (const path of ADMIN_ROUTES) await expectRouteAccessible(page, path)
      expect(await page.evaluate(() => localStorage.getItem('userRole'))).toBe('admin')
    } finally {
      await admin.close()
    }

    for (const account of [accounts.userA, accounts.userB]) {
      const context = await browser.newContext({ baseURL: BASE_URL, storageState: account.state })
      try {
        const page = await context.newPage()
        const homeRows = await bookingsLoadedBy(page, '/home')
        expect(homeRows.every((row) => row.doctorLicense === account.user.license),
          'หน้า Home ต้องได้รับเฉพาะคิวของบัญชีที่เข้าสู่ระบบ').toBe(true)
        await expect(page.locator('.admin-menu-button')).toHaveCount(0)

        const calendarRows = await bookingsLoadedBy(page, '/calendar')
        expect(calendarRows.every((row) => row.doctorLicense === account.user.license),
          'หน้า Calendar ต้องได้รับเฉพาะคิวของบัญชีที่เข้าสู่ระบบ').toBe(true)
        await expect(page.locator('.admin-menu-button')).toHaveCount(0)

        for (const path of USER_ROUTES) await expectRouteAccessible(page, path)
        expect(await page.evaluate(() => localStorage.getItem('userLicense'))).toBe(account.user.license)
        expect(await page.evaluate(() => localStorage.getItem('userRole'))).toBe('user')
      } finally {
        await context.close()
      }
    }

    const aIds = new Set(accounts.userA.bookings.map((row) => String(row.id)))
    const bIds = new Set(accounts.userB.bookings.map((row) => String(row.id)))
    expect([...aIds].some((id) => bIds.has(id)), 'คิวของ User A และ User B ต้องไม่ปะปนกัน').toBe(false)
  })

  test('TC-A08.2 บล็อกการพิมพ์ URL หน้า Admin โดยตรง', async ({ browser, accounts }) => {
    const anonymous = await browser.newContext({ baseURL: BASE_URL })
    try {
      const page = await anonymous.newPage()
      for (const path of ADMIN_ROUTES) {
        await page.goto(path)
        await expect(page).toHaveURL(/\/login$/)
        await expect(page.locator('.admin-menu-button')).toHaveCount(0)
      }
      await page.reload()
      await expect(page).toHaveURL(/\/login$/)
    } finally {
      await anonymous.close()
    }

    const userContext = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.userA.state })
    try {
      const page = await userContext.newPage()
      const successfulAdminResponses: string[] = []
      page.on('response', (response) => {
        const path = new URL(response.url()).pathname
        if (ADMIN_API_PATHS.has(path) && response.status() >= 200 && response.status() < 300) {
          successfulAdminResponses.push(`${response.status()} ${path}`)
        }
      })
      page.on('dialog', (dialog) => dialog.accept())

      for (const path of ADMIN_ROUTES) {
        await page.goto(path)
        await expect(page).toHaveURL(/\/home$/)
        await expect(page.locator('.admin-menu-button')).toHaveCount(0)
      }
      await page.reload()
      await expect(page).toHaveURL(/\/home$/)

      const tab = await userContext.newPage()
      tab.on('dialog', (dialog) => dialog.accept())
      await tab.goto('/admin-calendar')
      await expect(tab).toHaveURL(/\/home$/)
      await tab.goBack()
      await expect(tab).not.toHaveURL(/\/admin-/)
      expect(successfulAdminResponses, 'User ต้องไม่ได้รับข้อมูลจาก Admin-only API').toEqual([])
    } finally {
      await userContext.close()
    }

    const adminContext = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.admin.state })
    try {
      const page = await adminContext.newPage()
      for (const path of ADMIN_ROUTES) await expectRouteAccessible(page, path)
    } finally {
      await adminContext.close()
    }
  })

  test('TC-A08.3 ปฏิเสธ Token และสิทธิ์ที่ไม่ถูกต้องโดยไม่เปิดเผยหรือเปลี่ยนข้อมูล', async ({ browser, accounts }) => {
    const request = await apiRequest.newContext({ baseURL: BASE_URL })
    try {
      for (const authorization of [undefined, 'Invalid token', 'Bearer invalid.token.value',
        `Bearer ${tamperToken(accounts.userA.token)}`]) {
        const response = await request.get('/api/bookings', {
          headers: authorization ? { Authorization: authorization } : {},
        })
        expect(response.status()).toBe(401)
        safeErrorPayload(await response.json())
      }

      for (const path of ['/api/users', '/api/bookings/export', '/api/procedures/audit-logs']) {
        const response = await request.get(path, {
          headers: { Authorization: `Bearer ${accounts.userA.token}` },
        })
        expect(response.status(), `${path} ต้องปฏิเสธ User token`).toBe(403)
        safeErrorPayload(await response.json())
      }

      const foreignBooking = accounts.userB.bookings[0]
      if (foreignBooking) {
        const foreignRead = await request.get(`/api/bookings/${foreignBooking.id}`, {
          headers: { Authorization: `Bearer ${accounts.userA.token}` },
        })
        expect(foreignRead.status()).toBe(403)
        safeErrorPayload(await foreignRead.json())
      } else {
        coverageGap('User B ไม่มีคิวในฐานข้อมูลจริง จึงยังไม่ได้ตรวจ GET คิวของ User B ด้วย Token ของ User A')
      }

      const createForAnotherDoctor = await request.post('/api/bookings', {
        headers: { Authorization: `Bearer ${accounts.userA.token}` },
        data: {
          hn: '0000000',
          doctorLicense: accounts.userB.user.license,
        },
      })
      expect(createForAnotherDoctor.status()).toBe(403)
      safeErrorPayload(await createForAnotherDoctor.json())

      const ownerBooking = accounts.userA.bookings[0]
      if (ownerBooking) {
        const ownerRead = await request.get(`/api/bookings/${ownerBooking.id}`, {
          headers: { Authorization: `Bearer ${accounts.userA.token}` },
        })
        expect(ownerRead.status(), 'เจ้าของคิวต้องอ่านคิวของตนเองได้').toBe(200)
      } else {
        coverageGap('User A ไม่มีคิวในฐานข้อมูลจริง จึงยังไม่ได้ตรวจการอ่านคิวของตนเอง')
      }
      const adminRead = await request.get('/api/users', {
        headers: { Authorization: `Bearer ${accounts.admin.token}` },
      })
      expect(adminRead.status(), 'Admin token ต้องเรียก Admin API ได้').toBe(200)

      const userBRowsAfter = await request.get('/api/bookings', {
        headers: { Authorization: `Bearer ${accounts.userB.token}` },
      })
      expect(userBRowsAfter.status()).toBe(200)
      expect(await userBRowsAfter.json()).toEqual(accounts.userB.bookings)
    } finally {
      await request.dispose()
    }

    const invalidState = structuredClone(accounts.userA.state)
    const invalidOrigin = invalidState.origins.find((origin) => origin.origin === BASE_URL)!
    const tokenEntry = invalidOrigin.localStorage.find((entry) => entry.name === 'authToken')!
    tokenEntry.value = tamperToken(accounts.userA.token)
    const invalidSession = await browser.newContext({ baseURL: BASE_URL, storageState: invalidState })
    try {
      const page = await invalidSession.newPage()
      const rejected = page.waitForResponse((response) =>
        new URL(response.url()).pathname === '/api/bookings')
      await page.goto('/home')
      expect((await rejected).status()).toBe(401)
      await expect(page).toHaveURL(/\/login$/)
      expect(await page.evaluate(() => localStorage.getItem('authToken'))).toBeNull()
      expect(await page.evaluate(() => localStorage.getItem('isLoggedIn'))).toBeNull()
    } finally {
      await invalidSession.close()
    }

    const spoofed = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.userA.state })
    try {
      const page = await spoofed.newPage()
      await page.goto('/home')
      await page.evaluate(() => {
        localStorage.setItem('userRole', 'admin')
        localStorage.setItem('isLoggedIn', 'true')
      })
      const usersResponse = page.waitForResponse((response) =>
        new URL(response.url()).pathname === '/api/users')
      const bookingsResponse = page.waitForResponse((response) =>
        new URL(response.url()).pathname === '/api/bookings')
      await page.goto('/admin-home')
      const [users, bookings] = await Promise.all([usersResponse, bookingsResponse])
      expect(users.status(), 'การแก้ Local Storage ต้องไม่ทำให้ User token เรียก Admin API ได้').toBe(403)
      expect(bookings.status()).toBe(200)
      const rows = await bookings.json() as Booking[]
      expect(rows.every((row) => row.doctorLicense === accounts.userA.user.license),
        'Backend ต้องยังจำกัดข้อมูลตามเจ้าของ Token').toBe(true)
      test.info().annotations.push({
        type: 'coverage-note',
        description: 'Role ว่าง/not_admin/superadmin ที่มีลายเซ็นถูกต้องสร้างไม่ได้จากภายนอกโดยไม่มี JWT secret; ตรวจด้วย User token และ Local Storage spoofing แทน',
      })
    } finally {
      await spoofed.close()
    }
  })
})
