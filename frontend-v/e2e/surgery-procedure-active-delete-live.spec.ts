import {
  expect,
  request as apiRequest,
  test as base,
  type APIRequestContext,
  type BrowserContext,
  type Locator,
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
  isActive?: boolean
}

type Booking = {
  id: number
  hn: string
  fullName: string
  age: number
  gender: string
  procedure: string
  durationMinutes: number
  date: string
  room: string
  doctorLicense: string
  status: string
}

type AuditLog = {
  id: number
  procedureId: number
  procedureName: string
  action: 'created' | 'updated' | 'deleted'
  actorLicense: string
}

type Accounts = {
  request: APIRequestContext
  admin: Account
  userA: Account
}

const BASE_URL = 'https://project-or-room.vercel.app'
const GENERATED_NAME = /^E2E (Active|Status|Inactive) Procedure N03\b/
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

    if (!adminPassword) throw new Error('Set LIVE_ADMIN_PASSWORD locally before running active-delete tests.')
    if (!userEmail || !userPassword) {
      throw new Error('Set LIVE_USER_EMAIL and LIVE_USER_PASSWORD locally before running active-delete tests.')
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

function uniqueName(label: 'Active' | 'Status' | 'Inactive') {
  return `E2E ${label} Procedure N03 ${Date.now()} ${Math.random().toString(36).slice(2, 7)}`
}

async function listProcedures(accounts: Accounts, account = accounts.userA) {
  const response = await accounts.request.get('/api/procedures', { headers: auth(account) })
  const body = await response.text()
  expect(response.status(), `GET /api/procedures failed: ${body}`).toBe(200)
  return JSON.parse(body) as Procedure[]
}

async function createProcedure(accounts: Accounts, name: string, durationMinutes = 70) {
  const response = await accounts.request.post('/api/procedures', {
    headers: auth(accounts.userA),
    data: { name, durationMinutes },
  })
  expect(response.status(), `Create procedure ${name}`).toBe(201)
  return response.json() as Promise<Procedure>
}

async function listBookings(accounts: Accounts, account = accounts.userA) {
  const response = await accounts.request.get('/api/bookings', { headers: auth(account) })
  expect(response.status(), 'GET /api/bookings').toBe(200)
  return response.json() as Promise<Booking[]>
}

async function setBookingStatus(accounts: Accounts, id: number, status: string, account = accounts.userA) {
  const response = await accounts.request.patch(`/api/bookings/${id}/status`, {
    headers: auth(account),
    data: { status },
  })
  expect(response.status(), `Set booking ${id} to ${status}`).toBe(200)
}

async function unusedHn(accounts: Accounts) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const hn = String(8_000_000 + Math.floor(Math.random() * 1_000_000))
    const response = await accounts.request.get(`/api/patients/${hn}`, { headers: auth(accounts.userA) })
    if (response.status() === 404) return hn
  }
  throw new Error('Unable to find an unused seven-digit HN.')
}

function futureWeekday(offset: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + offset)
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

async function createBooking(
  accounts: Accounts,
  procedure: Procedure,
  label: string,
  finalStatus: 'Upcoming' | 'Succeed' | 'Cancelled' = 'Upcoming',
) {
  const hn = await unusedHn(accounts)
  const fullName = `E2E N03 ${label} ${Date.now()} ${Math.random().toString(36).slice(2, 6)}`
  const response = await accounts.request.post('/api/bookings', {
    headers: auth(accounts.userA),
    data: {
      hn,
      fullName,
      age: 40,
      gender: 'female',
      procedure: procedure.value,
      date: futureWeekday(20 + Math.floor(Math.random() * 40)),
      room: 'OR-220',
      underlying: '',
      diagnosis: 'E2E active surgery type protection',
      surgeryDetails: 'Created by TC-N03',
      cxrDate: '',
      cxrNote: '',
      ecgDate: '',
      ecgNote: '',
      labDate: '',
      labNote: '',
      admDate: '',
      admNote: '',
      notes: 'Playwright TC-N03',
      doctorLicense: accounts.userA.user.license,
    },
  })
  const responseBody = await response.text()
  expect(response.status(), `Create booking for ${procedure.name}: ${responseBody}`).toBe(201)

  const booking = (await listBookings(accounts)).find((row) => row.hn === hn && row.fullName === fullName)
  expect(booking, `Created booking for ${procedure.name} must be returned`).toBeTruthy()
  if (!booking) throw new Error(`Booking for ${procedure.name} was not returned`)

  if (finalStatus !== 'Upcoming') {
    await setBookingStatus(accounts, booking.id, finalStatus)
    booking.status = finalStatus
  }
  return booking
}

async function deleteProcedureApi(accounts: Accounts, procedure: Procedure, account = accounts.userA) {
  return accounts.request.delete(`/api/procedures/${procedure.id}`, { headers: auth(account) })
}

async function listAuditLogs(accounts: Accounts) {
  const response = await accounts.request.get('/api/procedures/audit-logs?limit=500', {
    headers: auth(accounts.admin),
  })
  expect(response.status()).toBe(200)
  return response.json() as Promise<AuditLog[]>
}

function deletedLogs(logs: AuditLog[], procedureId: number) {
  return logs.filter((log) => Number(log.procedureId) === procedureId && log.action === 'deleted')
}

async function cleanupProcedure(accounts: Accounts, procedure?: Procedure) {
  if (!procedure) return
  const bookings = await listBookings(accounts, accounts.admin)
  for (const booking of bookings.filter((row) =>
    (row.procedure === procedure.name || row.procedure === procedure.value)
    && !FINAL_STATUSES.has(row.status))) {
    await setBookingStatus(accounts, booking.id, 'Cancelled', accounts.admin)
  }
  const response = await deleteProcedureApi(accounts, procedure, accounts.admin)
  expect([200, 404], `Cleanup procedure ${procedure.id}: ${await response.text()}`).toContain(response.status())
}

async function cleanupStaleData(accounts: Accounts) {
  const procedures = (await listProcedures(accounts, accounts.admin)).filter((row) => GENERATED_NAME.test(row.name))
  for (const procedure of procedures) await cleanupProcedure(accounts, procedure)
}

async function openManager(page: Page) {
  await page.goto('/procedures')
  await page.getByRole('button', { name: 'Manage Surgery Types' }).click()
  const modal = page.locator('.procedure-modal')
  await expect(modal.getByRole('heading', { name: 'Manage Surgery Types' })).toBeVisible()
  return modal
}

function procedureItem(modal: Locator, name: string) {
  return modal.locator('.procedure-item').filter({ hasText: name })
}

async function tryDeleteThroughUi(page: Page, modal: Locator, name: string, expectedStatus: number) {
  await procedureItem(modal, name).getByRole('button', { name: 'Delete' }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Delete surgery type?' })
  await expect(dialog.locator('.confirm-target')).toHaveText(name)
  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname.startsWith('/api/procedures/')
    && response.request().method() === 'DELETE')
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click()
  const response = await responsePromise
  expect(response.status(), `Delete ${name}`).toBe(expectedStatus)
  return dialog
}

async function expectInDropdown(page: Page, procedure: Procedure, visible: boolean) {
  await page.goto('/booking')
  await page.getByRole('button', { name: 'Select Procedure' }).click()
  await page.getByPlaceholder('Search surgery types...').fill(procedure.name)
  const option = page.getByRole('option', { name: procedure.value, exact: true })
  if (visible) await expect(option).toBeVisible()
  else {
    await expect(option).toHaveCount(0)
    await expect(page.getByText('No matching surgery types.')).toBeVisible()
  }
}

function bookingRecord(booking: Booking) {
  return {
    id: booking.id,
    hn: booking.hn,
    fullName: booking.fullName,
    procedure: booking.procedure,
    durationMinutes: Number(booking.durationMinutes),
    date: booking.date,
    room: booking.room,
    doctorLicense: booking.doctorLicense,
    status: booking.status,
  }
}

test.describe('ป้องกันการลบประเภทการผ่าตัดที่มีคิวใช้งานอยู่ — live backend', () => {
  test('TC-N03.1 คิว Upcoming แสดง Active และบล็อกการลบพร้อมข้อความแจ้งเตือน', async ({ browser, accounts }) => {
    let procedure: Procedure | undefined
    let booking: Booking | undefined
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.userA.state })
    try {
      procedure = await createProcedure(accounts, uniqueName('Active'))
      booking = await createBooking(accounts, procedure, 'Upcoming')
      const beforeBooking = bookingRecord(booking)
      const beforeDeletedLogs = deletedLogs(await listAuditLogs(accounts), procedure.id)
      expect((await listProcedures(accounts)).find((row) => row.id === procedure?.id)?.isActive).toBe(true)

      const page = await context.newPage()
      const modal = await openManager(page)
      const item = procedureItem(modal, procedure.name)
      await expect(item.locator('.active-badge')).toHaveText('Active')

      const dialog = await tryDeleteThroughUi(page, modal, procedure.name, 409)
      await expect(dialog.locator('.error-message')).toContainText('active booking')
      await expect(item).toBeVisible()
      await dialog.getByRole('button', { name: 'Cancel' }).click()
      await modal.getByRole('button', { name: 'Refresh' }).click()
      await expect(procedureItem(modal, procedure.name).locator('.active-badge')).toHaveText('Active')

      await expectInDropdown(page, procedure, true)
      const storedBooking = (await listBookings(accounts)).find((row) => row.id === booking?.id)
      expect(storedBooking && bookingRecord(storedBooking)).toEqual(beforeBooking)
      expect(deletedLogs(await listAuditLogs(accounts), procedure.id)).toEqual(beforeDeletedLogs)
    } finally {
      await context.close()
      if (booking && !FINAL_STATUSES.has(booking.status)) await setBookingStatus(accounts, booking.id, 'Cancelled')
      await cleanupProcedure(accounts, procedure)
    }
  })

  test('TC-N03.2 เฉพาะ Upcoming เป็น Active ส่วน Succeed และ Cancelled ลบประเภทได้', async ({ browser, accounts }) => {
    const procedures: Partial<Record<'Upcoming' | 'Succeed' | 'Cancelled', Procedure>> = {}
    const bookings: Partial<Record<'Upcoming' | 'Succeed' | 'Cancelled', Booking>> = {}
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.userA.state })
    try {
      for (const status of ['Upcoming', 'Succeed', 'Cancelled'] as const) {
        procedures[status] = await createProcedure(accounts, uniqueName('Status'), status === 'Upcoming' ? 60 : 65)
        bookings[status] = await createBooking(accounts, procedures[status]!, status, status)
      }

      const procedureStates = await listProcedures(accounts)
      expect(procedureStates.find((row) => row.id === procedures.Upcoming!.id)?.isActive).toBe(true)
      expect(procedureStates.find((row) => row.id === procedures.Succeed!.id)?.isActive).toBe(false)
      expect(procedureStates.find((row) => row.id === procedures.Cancelled!.id)?.isActive).toBe(false)

      const page = await context.newPage()
      const modal = await openManager(page)
      await expect(procedureItem(modal, procedures.Upcoming!.name).locator('.active-badge')).toHaveText('Active')
      await expect(procedureItem(modal, procedures.Succeed!.name).locator('.active-badge')).toHaveCount(0)
      await expect(procedureItem(modal, procedures.Cancelled!.name).locator('.active-badge')).toHaveCount(0)

      const activeDialog = await tryDeleteThroughUi(page, modal, procedures.Upcoming!.name, 409)
      await expect(activeDialog.locator('.error-message')).toContainText('active booking')
      await activeDialog.getByRole('button', { name: 'Cancel' }).click()

      for (const status of ['Succeed', 'Cancelled'] as const) {
        const dialog = await tryDeleteThroughUi(page, modal, procedures[status]!.name, 200)
        await expect(dialog).toBeHidden()
        await expect(procedureItem(modal, procedures[status]!.name)).toHaveCount(0)
      }

      const storedProcedures = await listProcedures(accounts)
      expect(storedProcedures.some((row) => row.id === procedures.Upcoming!.id)).toBe(true)
      expect(storedProcedures.some((row) => row.id === procedures.Succeed!.id)).toBe(false)
      expect(storedProcedures.some((row) => row.id === procedures.Cancelled!.id)).toBe(false)

      const storedBookings = await listBookings(accounts)
      for (const status of ['Upcoming', 'Succeed', 'Cancelled'] as const) {
        const stored = storedBookings.find((row) => row.id === bookings[status]!.id)
        expect(stored?.status).toBe(status)
        expect(stored?.procedure).toBe(procedures[status]!.value)
      }
    } finally {
      await context.close()
      if (bookings.Upcoming) await setBookingStatus(accounts, bookings.Upcoming.id, 'Cancelled')
      for (const procedure of Object.values(procedures)) await cleanupProcedure(accounts, procedure)
    }
  })

  test('TC-N03.3 ไม่มีคิว Active ลบประเภทได้โดยข้อมูลคิวประวัติยังคงเดิม', async ({ browser, accounts }) => {
    let procedure: Procedure | undefined
    let booking: Booking | undefined
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.userA.state })
    try {
      procedure = await createProcedure(accounts, uniqueName('Inactive'), 80)
      booking = await createBooking(accounts, procedure, 'History', 'Succeed')
      const beforeBooking = bookingRecord(booking)
      const beforeDeletedCount = deletedLogs(await listAuditLogs(accounts), procedure.id).length
      expect((await listProcedures(accounts)).find((row) => row.id === procedure?.id)?.isActive).toBe(false)

      const page = await context.newPage()
      const modal = await openManager(page)
      await expect(procedureItem(modal, procedure.name).locator('.active-badge')).toHaveCount(0)
      const dialog = await tryDeleteThroughUi(page, modal, procedure.name, 200)
      await expect(dialog).toBeHidden()
      await modal.getByRole('button', { name: 'Refresh' }).click()
      await expect(procedureItem(modal, procedure.name)).toHaveCount(0)

      await expectInDropdown(page, procedure, false)
      expect((await listProcedures(accounts)).some((row) => row.id === procedure?.id)).toBe(false)
      const storedBooking = (await listBookings(accounts)).find((row) => row.id === booking?.id)
      expect(storedBooking && bookingRecord(storedBooking)).toEqual(beforeBooking)
      expect(deletedLogs(await listAuditLogs(accounts), procedure.id)).toHaveLength(beforeDeletedCount + 1)
    } finally {
      await context.close()
      await cleanupProcedure(accounts, procedure)
    }
  })
})
