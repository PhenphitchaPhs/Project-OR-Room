import {
  expect,
  request as apiRequest,
  test as base,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test'

type LoginUser = {
  license: string
  doctorName: string
  email?: string
  orNumber?: string | number
  role: 'admin' | 'user'
}

type Account = {
  token: string
  user: LoginUser
  state: Awaited<ReturnType<BrowserContext['storageState']>>
}

type Procedure = {
  id: number
  name: string
  durationMinutes: number
  createdBy: string
  value: string
}

type Booking = {
  id: number
  hn: string
  fullName: string
  procedure: string
  durationMinutes: number
  date: string
  room: string
  doctorLicense: string
  status: string
}

type Accounts = {
  request: APIRequestContext
  admin: Account
  userA: Account
}

const BASE_URL = 'https://project-or-room.vercel.app'
const STANDARD_NAME = 'Laparoscopic Cholecystectomy / LC'
const GENERATED_NAME = /^E2E (Search|Booking|Similar) Procedure N04\b/
const FINAL_STATUSES = new Set(['Cancelled', 'Completed', 'Succeed'])

function auth(account: Account) {
  return { Authorization: `Bearer ${account.token}` }
}

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
  role: LoginUser['role'],
): Promise<Account> {
  const response = await request.post('/api/login', {
    data: role === 'admin'
      ? { license: identifier, password }
      : { email: identifier, password },
  })
  expect(response.status(), `Login must succeed for ${identifier}`).toBe(200)
  const body = await response.json() as { token: string; user: LoginUser }
  expect(body.token).toBeTruthy()
  expect(body.user.role).toBe(role)
  return { token: body.token, user: body.user, state: storageState(body.token, body.user) }
}

const test = base.extend<Record<string, never>, { accounts: Accounts }>({
  accounts: [async ({}, use) => {
    const adminUsername = process.env.LIVE_ADMIN_USERNAME || 'admin007'
    const adminPassword = process.env.LIVE_ADMIN_PASSWORD
    const userEmail = process.env.LIVE_USER_EMAIL
    const userPassword = process.env.LIVE_USER_PASSWORD

    if (!adminPassword) throw new Error('Set LIVE_ADMIN_PASSWORD locally before running procedure search tests.')
    if (!userEmail || !userPassword) {
      throw new Error('Set LIVE_USER_EMAIL and LIVE_USER_PASSWORD locally before running procedure search tests.')
    }

    const request = await apiRequest.newContext({ baseURL: BASE_URL })
    try {
      const [admin, userA] = await Promise.all([
        login(request, adminUsername, adminPassword, 'admin'),
        login(request, userEmail, userPassword, 'user'),
      ])
      const accounts = { request, admin, userA }
      await cleanupStaleData(accounts)
      await use(accounts)
    } finally {
      await request.dispose()
    }
  }, { scope: 'worker' }],
})

function uniqueName(label: 'Search' | 'Booking' | 'Similar', suffix = '') {
  const ending = `${Date.now()} ${Math.random().toString(36).slice(2, 7)}`
  return `E2E ${label} Procedure N04 ${ending}${suffix ? ` ${suffix}` : ''}`
}

async function listProcedures(accounts: Accounts, account = accounts.userA) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await accounts.request.get('/api/procedures', { headers: auth(account) })
    if (response.status() === 200) return response.json() as Promise<Procedure[]>
    const body = await response.text()
    if (response.status() < 500 || attempt === 3) {
      expect(response.status(), `GET /api/procedures failed: ${body}`).toBe(200)
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 500))
  }
  throw new Error('GET /api/procedures did not return a response')
}

async function createProcedure(accounts: Accounts, name: string, durationMinutes: number) {
  const response = await accounts.request.post('/api/procedures', {
    headers: auth(accounts.userA),
    data: { name, durationMinutes },
  })
  expect(response.status(), `Create procedure ${name}`).toBe(201)
  return response.json() as Promise<Procedure>
}

async function listBookings(accounts: Accounts, account = accounts.userA) {
  const response = await accounts.request.get('/api/bookings', { headers: auth(account) })
  expect(response.status()).toBe(200)
  return response.json() as Promise<Booking[]>
}

async function setBookingStatus(accounts: Accounts, id: number, status: string, account = accounts.userA) {
  const response = await accounts.request.patch(`/api/bookings/${id}/status`, {
    headers: auth(account),
    data: { status },
  })
  expect(response.status(), `Set booking ${id} to ${status}`).toBe(200)
}

async function cleanupProcedure(accounts: Accounts, procedure?: Procedure) {
  if (!procedure) return
  const bookings = await listBookings(accounts, accounts.admin)
  for (const booking of bookings.filter((row) =>
    (row.procedure === procedure.name || row.procedure === procedure.value)
    && !FINAL_STATUSES.has(row.status))) {
    await setBookingStatus(accounts, booking.id, 'Cancelled', accounts.admin)
  }
  const response = await accounts.request.delete(`/api/procedures/${procedure.id}`, {
    headers: auth(accounts.admin),
  })
  const body = await response.text()
  expect([200, 404], `Cleanup procedure ${procedure.id}: ${body}`).toContain(response.status())
}

async function cleanupStaleData(accounts: Accounts) {
  const procedures = (await listProcedures(accounts, accounts.admin)).filter((row) => GENERATED_NAME.test(row.name))
  for (const procedure of procedures) await cleanupProcedure(accounts, procedure)
}

async function openBookingPage(page: Page) {
  const proceduresLoaded = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/procedures'
    && response.request().method() === 'GET')
  await page.goto('/booking')
  const response = await proceduresLoaded
  expect(response.status(), 'The booking page must load additional surgery types').toBe(200)
  await expect(page.getByRole('button', { name: 'Select Procedure' })).toBeVisible()
}

async function openProcedureDropdown(page: Page) {
  await page.getByRole('button', { name: 'Select Procedure' }).click()
  const search = page.getByPlaceholder('Search surgery types...')
  const listbox = page.getByRole('listbox', { name: 'Surgery types' })
  await expect(search).toBeVisible()
  await expect(listbox).toBeVisible()
  return { search, listbox, options: listbox.getByRole('option') }
}

async function unusedHn(accounts: Accounts) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const hn = String(8_000_000 + Math.floor(Math.random() * 1_000_000))
    const response = await accounts.request.get(`/api/patients/${hn}`, { headers: auth(accounts.userA) })
    if (response.status() === 404) return hn
  }
  throw new Error('Unable to find an unused seven-digit HN.')
}

async function bookableDate(accounts: Accounts) {
  const response = await accounts.request.get('/api/holidays', { headers: auth(accounts.userA) })
  const holidays = new Set<string>()
  if (response.ok()) {
    const body = await response.json() as { items?: Array<{ start?: { date?: string } }> }
    for (const item of body.items || []) if (item.start?.date) holidays.add(item.start.date)
  }

  const today = new Date()
  for (let offset = 14; offset <= 80; offset += 1) {
    const candidate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset))
    const iso = candidate.toISOString().slice(0, 10)
    if (candidate.getUTCDay() !== 0 && candidate.getUTCDay() !== 6 && !holidays.has(iso)) return iso
  }
  throw new Error('Unable to find an available weekday in the booking window.')
}

async function submitBooking(
  page: Page,
  accounts: Accounts,
  procedure: Procedure,
  label: string,
) {
  const hn = await unusedHn(accounts)
  const fullName = `E2E N04 ${label} ${Date.now()} ${Math.random().toString(36).slice(2, 6)}`
  const date = await bookableDate(accounts)

  await page.getByPlaceholder('HN (7 digits)').fill(hn)
  await page.getByPlaceholder('Full Name').fill(fullName)
  await page.getByPlaceholder('Age (years)').fill('40')
  await page.locator('select').filter({ hasText: 'Male' }).selectOption('female')
  await page.locator('.room-select').selectOption('OR-220')
  await page.locator('#surgery-date').fill(date)

  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/bookings'
    && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Confirm Booking' }).click()
  const response = await responsePromise
  expect(response.status(), `Create a booking with ${procedure.name}`).toBe(201)
  await expect(page.locator('.alert-modal')).toContainText('Booking created successfully!')

  const booking = (await listBookings(accounts)).find((row) => row.hn === hn && row.fullName === fullName)
  expect(booking, 'The created booking must be returned by the live backend').toBeTruthy()
  if (!booking) throw new Error('The created booking was not returned')
  return booking
}

test.describe('ค้นหาและเลือกประเภทการผ่าตัดในหน้าเพิ่มคิว — live backend', () => {
  test('TC-N04.1 ค้นหาใน Dropdown หน้าเพิ่มคิว', async ({ browser, accounts }) => {
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.userA.state })
    try {
      const page = await context.newPage()
      await openBookingPage(page)
      let dropdown = await openProcedureDropdown(page)
      const initialCount = await dropdown.options.count()
      expect(initialCount).toBeGreaterThan(0)

      await dropdown.search.fill('Cholecystectomy')
      await expect(dropdown.options.filter({ hasText: STANDARD_NAME })).toBeVisible()
      for (const text of await dropdown.options.allTextContents()) {
        expect(text.toLowerCase()).toContain('cholecystectomy')
      }

      await dropdown.search.fill('')
      await expect(dropdown.options).toHaveCount(initialCount)
      await dropdown.search.press('Escape')
      await expect(dropdown.listbox).toBeHidden()

      dropdown = await openProcedureDropdown(page)
      await expect(dropdown.search).toHaveValue('')
      await expect(dropdown.options).toHaveCount(initialCount)
    } finally {
      await context.close()
    }
  })

  test('TC-N04.2 ค้นหาได้ทั้งประเภทมาตรฐานและประเภทเพิ่มเติมโดยไม่แสดงรายการซ้ำ', async ({ browser, accounts }) => {
    const customName = uniqueName('Search')
    let procedure: Procedure | undefined
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.userA.state })
    try {
      procedure = await createProcedure(accounts, customName, 75)
      const page = await context.newPage()
      await openBookingPage(page)
      const dropdown = await openProcedureDropdown(page)

      await dropdown.search.fill(STANDARD_NAME)
      await expect(dropdown.options.filter({ hasText: STANDARD_NAME })).toBeVisible()
      await expect(dropdown.listbox.locator('.group-label').filter({ hasText: 'General Surgery' })).toBeVisible()

      await dropdown.search.fill('cholecyst')
      await expect(dropdown.options.filter({ hasText: STANDARD_NAME })).toBeVisible()

      await dropdown.search.fill(customName)
      await expect(dropdown.listbox.locator('.group-label', { hasText: 'Additional' })).toBeVisible()
      await expect(page.getByRole('option', { name: procedure.value, exact: true })).toHaveCount(1)

      const partial = customName.split(' ').at(-1)!
      await dropdown.search.fill(partial)
      await expect(page.getByRole('option', { name: procedure.value, exact: true })).toBeVisible()
      expect((await dropdown.options.allTextContents()).every((text) =>
        text.toLowerCase().includes(partial.toLowerCase()))).toBe(true)
    } finally {
      await context.close()
      await cleanupProcedure(accounts, procedure)
    }
  })

  test('TC-N04.3 ประเภทการผ่าตัดเพิ่มเติมเลือกใช้สร้างคิวได้และบันทึกระยะเวลาถูกต้อง', async ({ browser, accounts }) => {
    const customName = uniqueName('Booking')
    let procedure: Procedure | undefined
    let booking: Booking | undefined
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.userA.state })
    try {
      procedure = await createProcedure(accounts, customName, 70)
      const page = await context.newPage()
      await openBookingPage(page)
      const dropdown = await openProcedureDropdown(page)
      await dropdown.search.fill(customName)
      await expect(dropdown.listbox.locator('.group-label', { hasText: 'Additional' })).toBeVisible()
      await page.getByRole('option', { name: procedure.value, exact: true }).click()
      await expect(dropdown.listbox).toBeHidden()
      await expect(page.getByRole('button', { name: 'Select Procedure' })).toContainText(procedure.value)

      booking = await submitBooking(page, accounts, procedure, 'Booking')
      expect(booking.procedure).toBe(procedure.value)
      expect(Number(booking.durationMinutes)).toBe(70)
      expect(booking.doctorLicense).toBe(accounts.userA.user.license)

      await page.goto(`/booking/${booking.id}`)
      await expect(page.getByPlaceholder('HN (7 digits)')).toHaveValue(booking.hn)
      await expect(page.getByRole('button', { name: 'Select Procedure' })).toContainText(procedure.value)
    } finally {
      await context.close()
      if (booking && !FINAL_STATUSES.has(booking.status)) await setBookingStatus(accounts, booking.id, 'Cancelled')
      await cleanupProcedure(accounts, procedure)
    }
  })

  test('TC-N04.4 รองรับตัวพิมพ์ คำบางส่วน ช่องว่าง ไม่มีผลลัพธ์ และเลือกชื่อใกล้เคียงได้ถูกต้อง', async ({ browser, accounts }) => {
    const baseName = uniqueName('Similar')
    let procedureA: Procedure | undefined
    let procedureB: Procedure | undefined
    let booking: Booking | undefined
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.userA.state })
    try {
      procedureA = await createProcedure(accounts, `${baseName} Alpha`, 55)
      procedureB = await createProcedure(accounts, `${baseName} Beta`, 85)
      const page = await context.newPage()
      await openBookingPage(page)
      const dropdown = await openProcedureDropdown(page)

      for (const query of [procedureA.name.toLowerCase(), procedureA.name.toUpperCase(), `  ${procedureA.name}  `]) {
        await dropdown.search.fill(query)
        await expect(page.getByRole('option', { name: procedureA.value, exact: true })).toBeVisible()
      }

      const sharedTerm = baseName.split(' ').slice(-2).join(' ')
      await dropdown.search.fill(sharedTerm)
      await expect(page.getByRole('option', { name: procedureA.value, exact: true })).toBeVisible()
      await expect(page.getByRole('option', { name: procedureB.value, exact: true })).toBeVisible()

      await dropdown.search.fill(`NO-MATCH-N04-${Date.now()}`)
      await expect(dropdown.options).toHaveCount(0)
      await expect(page.getByText('No matching surgery types.')).toBeVisible()

      await dropdown.search.fill(sharedTerm)
      await page.getByRole('option', { name: procedureB.value, exact: true }).click()
      await expect(page.getByRole('button', { name: 'Select Procedure' })).toContainText(procedureB.value)

      booking = await submitBooking(page, accounts, procedureB, 'Similar')
      expect(booking.procedure).toBe(procedureB.value)
      expect(booking.procedure).not.toBe(procedureA.value)
      expect(Number(booking.durationMinutes)).toBe(85)
    } finally {
      await context.close()
      if (booking && !FINAL_STATUSES.has(booking.status)) await setBookingStatus(accounts, booking.id, 'Cancelled')
      await cleanupProcedure(accounts, procedureB)
      await cleanupProcedure(accounts, procedureA)
    }
  })
})
