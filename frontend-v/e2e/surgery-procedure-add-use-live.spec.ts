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
  createdByName?: string
  value: string
  isActive?: boolean
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
  userB: Account
}

const BASE_URL = 'https://project-or-room.vercel.app'

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
    const userAEmail = process.env.LIVE_USER_EMAIL
    const userAPassword = process.env.LIVE_USER_PASSWORD
    const userBEmail = process.env.LIVE_USER_B_EMAIL
    const userBPassword = process.env.LIVE_USER_B_PASSWORD || userAPassword

    if (!adminPassword) throw new Error('Set LIVE_ADMIN_PASSWORD locally before running surgery type tests.')
    if (!userAEmail || !userAPassword) {
      throw new Error('Set LIVE_USER_EMAIL and LIVE_USER_PASSWORD locally before running surgery type tests.')
    }
    if (!userBEmail || !userBPassword) {
      throw new Error('Set LIVE_USER_B_EMAIL and LIVE_USER_B_PASSWORD locally before running surgery type tests.')
    }

    const request = await apiRequest.newContext({ baseURL: BASE_URL })
    try {
      const [admin, userA, userB] = await Promise.all([
        login(request, adminUsername, adminPassword, 'admin'),
        login(request, userAEmail, userAPassword, 'user'),
        login(request, userBEmail, userBPassword, 'user'),
      ])
      expect(userA.user.license).not.toBe(userB.user.license)
      const accounts = { request, admin, userA, userB }
      await cleanupStaleProcedures(accounts)
      await use(accounts)
    } finally {
      await request.dispose()
    }
  }, { scope: 'worker' }],
})

function auth(account: Account) {
  return { Authorization: `Bearer ${account.token}` }
}

function uniqueName(label: string) {
  return `E2E ${label} ${Date.now()} ${Math.random().toString(36).slice(2, 7)}`
}

async function listProcedures(accounts: Accounts, account = accounts.userA) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await accounts.request.get('/api/procedures', { headers: auth(account) })
    if (response.status() === 200) return response.json() as Promise<Procedure[]>

    if (response.status() >= 500 && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 500))
      continue
    }

    const body = await response.text()
    expect(response.status(), `GET /api/procedures failed: ${body}`).toBe(200)
  }
  throw new Error('GET /api/procedures did not return a response')
}

async function createProcedure(accounts: Accounts, account: Account, name: string, durationMinutes = 70) {
  const response = await accounts.request.post('/api/procedures', {
    headers: auth(account),
    data: { name, durationMinutes },
  })
  expect(response.status(), `Create procedure ${name}`).toBe(201)
  return response.json() as Promise<Procedure>
}

async function deleteProcedure(accounts: Accounts, account: Account, id?: number) {
  if (!id) return
  const actors = account.token === accounts.admin.token ? [account] : [account, accounts.admin]
  let lastStatus = 0
  let lastBody = ''

  for (const actor of actors) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await accounts.request.delete(`/api/procedures/${id}`, { headers: auth(actor) })
      lastStatus = response.status()
      if (lastStatus === 200 || lastStatus === 404) return
      lastBody = await response.text()
      if (lastStatus < 500) break
      await new Promise((resolve) => setTimeout(resolve, attempt * 500))
    }
  }

  expect([200, 404], `Cleanup procedure ${id} failed (${lastStatus}): ${lastBody}`).toContain(lastStatus)
}

function isGeneratedProcedureName(name: string) {
  return /^E2E (Minor Surgery|Shared Surgery|Duplicate|Recovered|Invalid Duration|Persistent Surgery)\b/.test(name)
}

async function cleanupStaleProcedures(accounts: Accounts) {
  const procedures = await listProcedures(accounts, accounts.admin)
  const stale = procedures.filter((procedure) =>
    String(procedure.createdBy) === String(accounts.userA.user.license)
    && isGeneratedProcedureName(procedure.name))
  for (const procedure of stale) {
    await deleteProcedure(accounts, accounts.admin, procedure.id)
  }
}

async function listBookings(accounts: Accounts, account: Account) {
  const response = await accounts.request.get('/api/bookings', { headers: auth(account) })
  expect(response.status()).toBe(200)
  return response.json() as Promise<Booking[]>
}

async function cancelBooking(accounts: Accounts, account: Account, id?: number) {
  if (!id) return
  const response = await accounts.request.patch(`/api/bookings/${id}/status`, {
    headers: auth(account),
    data: { status: 'Cancelled' },
  })
  expect(response.status(), `Cancel temporary booking ${id}`).toBe(200)
}

async function openProcedureManager(page: Page, path = '/booking') {
  await page.goto(path)
  await page.getByRole('button', { name: 'Manage Surgery Types' }).click()
  const modal = page.locator('.procedure-modal')
  await expect(modal.getByRole('heading', { name: 'Manage Surgery Types' })).toBeVisible()
  await expect(modal.getByRole('heading', { name: 'Additional' })).toBeVisible()
  return modal
}

function procedureItem(modal: Locator, name: string) {
  return modal.locator('.procedure-item').filter({ hasText: name })
}

async function addProcedureThroughUi(modal: Locator, name: string, durationMinutes = 70) {
  await modal.getByLabel('Surgery type').fill(name)
  await modal.getByLabel('Estimated duration (minutes)').fill(String(durationMinutes))
  const responsePromise = modal.page().waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/procedures'
    && response.request().method() === 'POST')
  await modal.getByRole('button', { name: 'Add surgery type' }).click()
  const response = await responsePromise
  expect(response.status(), `Create ${name} through the UI`).toBe(201)
  const procedure = await response.json() as Procedure
  await expect(procedureItem(modal, name)).toContainText(`${durationMinutes} minutes`)
  return procedure
}

async function chooseUnusedHn(accounts: Accounts, account: Account) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const hn = String(8_000_000 + Math.floor(Math.random() * 1_000_000))
    const response = await accounts.request.get(`/api/patients/${hn}`, { headers: auth(account) })
    if (response.status() === 404) return hn
  }
  throw new Error('Unable to find an unused seven-digit HN for the temporary booking.')
}

async function chooseBookableDate(accounts: Accounts, account: Account) {
  const holidaysResponse = await accounts.request.get('/api/holidays', { headers: auth(account) })
  const holidayDates = new Set<string>()
  if (holidaysResponse.ok()) {
    const body = await holidaysResponse.json() as { items?: Array<{ start?: { date?: string } }> }
    for (const item of body.items || []) {
      if (item.start?.date) holidayDates.add(item.start.date)
    }
  }

  const start = new Date()
  for (let offset = 14; offset <= 80; offset += 1) {
    const candidate = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + offset))
    const day = candidate.getUTCDay()
    const iso = candidate.toISOString().slice(0, 10)
    if (day !== 0 && day !== 6 && !holidayDates.has(iso)) return iso
  }
  throw new Error('Unable to find a weekday that is not an official holiday within the booking window.')
}

test.describe('เพิ่มและใช้งานประเภทการผ่าตัดเพิ่มเติม — live backend', () => {
  test('TC-N01.1 เพิ่มประเภทการผ่าตัดเพิ่มเติมและกำหนดระยะเวลา', async ({ browser, accounts }) => {
    const name = uniqueName('Minor Surgery')
    let created: Procedure | undefined
    const before = await listProcedures(accounts)
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.userA.state })
    try {
      const page = await context.newPage()
      const modal = await openProcedureManager(page)
      await expect(modal.locator('.procedure-count')).toHaveText(`${before.length} type(s)`)

      created = await addProcedureThroughUi(modal, name, 70)
      const item = procedureItem(modal, name)
      await expect(item).toContainText('70 minutes')
      await expect(item).toContainText('Created by you')
      await expect(modal.locator('.procedure-count')).toHaveText(`${before.length + 1} type(s)`)
      await expect(modal.getByLabel('Surgery type')).toHaveValue('')
      await expect(modal.getByLabel('Estimated duration (minutes)')).toHaveValue('')
      await expect(modal.locator('.error-message')).toHaveCount(0)

      const after = await listProcedures(accounts)
      expect(after.filter((row) => row.name === name)).toHaveLength(1)
      expect(after.find((row) => row.name === name)?.durationMinutes).toBe(70)
    } finally {
      await context.close()
      await deleteProcedure(accounts, accounts.userA, created?.id)
    }
  })

  test('TC-N01.2 ผู้ใช้ทุกคนมองเห็นและใช้ประเภทเพิ่มเติมในการจองได้', async ({ browser, accounts }) => {
    const name = uniqueName('Shared Surgery')
    const fullValue = `${name} - 70 mins`
    const patientName = uniqueName('Patient')
    const proceduresBefore = await listProcedures(accounts)
    let procedure: Procedure | undefined
    let hn = ''
    let date = ''
    let bookingId: number | undefined

    try {
      procedure = await createProcedure(accounts, accounts.userA, name)
      hn = await chooseUnusedHn(accounts, accounts.userB)
      date = await chooseBookableDate(accounts, accounts.userB)
      const userBContext = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.userB.state })
      try {
        const page = await userBContext.newPage()
        const modal = await openProcedureManager(page)
        const sharedItem = procedureItem(modal, name)
        await expect(sharedItem).toBeVisible()
        await expect(sharedItem).toContainText('70 minutes')
        await expect(sharedItem).not.toContainText('Created by you')
        await modal.getByRole('button', { name: 'Close' }).click()

        await page.getByRole('button', { name: 'Select Procedure' }).click()
        await expect(page.getByRole('listbox', { name: 'Surgery types' })).toContainText('Additional')
        await page.getByPlaceholder('Search surgery types...').fill(name)
        await page.getByRole('option', { name: fullValue, exact: true }).click()
        await expect(page.getByRole('button', { name: 'Select Procedure' })).toContainText(fullValue)

        await page.getByPlaceholder('HN (7 digits)').fill(hn)
        await page.getByPlaceholder('Full Name').fill(patientName)
        await page.getByPlaceholder('Age (years)').fill('40')
        await page.locator('select').filter({ hasText: 'Male' }).selectOption('male')
        await page.locator('.room-select').selectOption('OR-220')
        await page.locator('#surgery-date').fill(date)

        const bookingResponsePromise = page.waitForResponse((response) =>
          new URL(response.url()).pathname === '/api/bookings'
          && response.request().method() === 'POST')
        await page.getByRole('button', { name: 'Confirm Booking' }).click()
        const bookingResponse = await bookingResponsePromise
        expect(bookingResponse.status()).toBe(201)
        await expect(page.locator('.alert-modal')).toContainText('Booking created successfully!')

        const bookings = await listBookings(accounts, accounts.userB)
        const booking = bookings.find((row) => row.hn === hn && row.fullName === patientName)
        expect(booking, 'The temporary booking must be returned to User B').toBeTruthy()
        bookingId = booking?.id
        expect(booking?.doctorLicense).toBe(accounts.userB.user.license)
        expect(booking?.procedure).toBe(fullValue)
        expect(Number(booking?.durationMinutes)).toBe(70)
        expect(booking?.date).toBe(date)

        const proceduresAfterBooking = await listProcedures(accounts)
        expect(proceduresAfterBooking.filter((row) => row.name === name)).toHaveLength(1)
        expect(proceduresAfterBooking
          .filter((row) => row.id !== procedure?.id)
          .map(({ id, name: rowName, durationMinutes }) => ({ id, name: rowName, durationMinutes })))
          .toEqual(proceduresBefore
            .map(({ id, name: rowName, durationMinutes }) => ({ id, name: rowName, durationMinutes })))
      } finally {
        await userBContext.close()
      }

      const adminContext = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.admin.state })
      try {
        const adminPage = await adminContext.newPage()
        const adminModal = await openProcedureManager(adminPage, '/admin-procedures')
        await expect(procedureItem(adminModal, name)).toContainText('70 minutes')
      } finally {
        await adminContext.close()
      }
    } finally {
      if (!bookingId && hn) {
        const bookings = await listBookings(accounts, accounts.userB)
        bookingId = bookings.find((row) => row.hn === hn && row.fullName === patientName)?.id
      }
      await cancelBooking(accounts, accounts.userB, bookingId)
      await deleteProcedure(accounts, accounts.userA, procedure?.id)
    }
  })

  test('TC-N01.3 ป้องกันข้อมูลประเภทการผ่าตัดที่ไม่ถูกต้อง', async ({ browser, accounts }) => {
    const existingName = uniqueName('Duplicate')
    const recoveredName = uniqueName('Recovered')
    let existing: Procedure | undefined
    let recovered: Procedure | undefined
    let context: BrowserContext | undefined

    try {
      existing = await createProcedure(accounts, accounts.userA, existingName)
      const initialRows = await listProcedures(accounts)
      context = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.userA.state })
      const page = await context.newPage()
      const modal = await openProcedureManager(page)
      const nameInput = modal.getByLabel('Surgery type')
      const durationInput = modal.getByLabel('Estimated duration (minutes)')
      const submit = modal.getByRole('button', { name: 'Add surgery type' })

      await durationInput.fill('70')
      await submit.click()
      expect(await nameInput.evaluate((element: HTMLInputElement) => element.validity.valueMissing)).toBe(true)

      await nameInput.fill('   ')
      await submit.click()
      expect(await nameInput.evaluate((element: HTMLInputElement) => element.validity.valueMissing)).toBe(true)
      await expect(nameInput).toBeFocused()

      await nameInput.fill(existingName)
      const duplicateResponsePromise = page.waitForResponse((response) =>
        new URL(response.url()).pathname === '/api/procedures'
        && response.request().method() === 'POST')
      await submit.click()
      const duplicateResponse = await duplicateResponsePromise
      expect(duplicateResponse.status()).toBe(409)
      await expect(modal.locator('.error-message')).toContainText('already exists')

      for (const invalidDuration of ['0', '-1']) {
        await nameInput.fill(uniqueName('Invalid Duration'))
        await durationInput.fill(invalidDuration)
        await submit.click()
        expect(await durationInput.evaluate((element: HTMLInputElement) => element.validity.rangeUnderflow)).toBe(true)
      }

      await durationInput.evaluate((element: HTMLInputElement) => {
        element.value = 'not-a-number'
        element.dispatchEvent(new Event('input', { bubbles: true }))
      })
      expect(await durationInput.inputValue()).toBe('')
      await submit.click()
      expect(await durationInput.evaluate((element: HTMLInputElement) => element.validity.valueMissing)).toBe(true)

      const afterInvalid = await listProcedures(accounts)
      expect(afterInvalid).toHaveLength(initialRows.length)
      expect(afterInvalid.filter((row) => row.name === existingName)).toHaveLength(1)

      recovered = await addProcedureThroughUi(modal, recoveredName, 70)
      await expect(procedureItem(modal, recoveredName)).toContainText('70 minutes')
    } finally {
      await context?.close()
      await deleteProcedure(accounts, accounts.userA, recovered?.id)
      await deleteProcedure(accounts, accounts.userA, existing?.id)
    }
  })

  test('TC-N01.4 ประเภทเพิ่มเติมยังคงอยู่หลัง Refresh และเข้าสู่ระบบใหม่', async ({ browser, accounts }) => {
    const name = uniqueName('Persistent Surgery')
    const fullValue = `${name} - 70 mins`
    let procedure: Procedure | undefined

    try {
      procedure = await createProcedure(accounts, accounts.userA, name)
      const initialRows = await listProcedures(accounts)
      const firstContext = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.userA.state })
      try {
        const page = await firstContext.newPage()
        let modal = await openProcedureManager(page)
        await expect(procedureItem(modal, name)).toContainText('70 minutes')
        await expect(procedureItem(modal, name)).toContainText('Created by you')
        await expect(modal.locator('.procedure-item')).toHaveCount(initialRows.length)
        const initialCount = initialRows.length

        await modal.getByRole('button', { name: 'Refresh' }).click()
        await expect(modal.getByRole('button', { name: 'Refresh' })).toBeEnabled()
        await expect(procedureItem(modal, name)).toBeVisible()
        await expect(modal.locator('.procedure-item')).toHaveCount(initialCount)

        await modal.getByRole('button', { name: 'Close' }).click()
        modal = await openProcedureManager(page)
        await expect(procedureItem(modal, name)).toBeVisible()
        await page.reload()
        modal = await openProcedureManager(page)
        await expect(procedureItem(modal, name)).toBeVisible()
      } finally {
        await firstContext.close()
      }

      const userAEmail = process.env.LIVE_USER_EMAIL!
      const userAPassword = process.env.LIVE_USER_PASSWORD!
      const reloggedUserA = await login(accounts.request, userAEmail, userAPassword, 'user')
      const reloggedContext = await browser.newContext({ baseURL: BASE_URL, storageState: reloggedUserA.state })
      try {
        const page = await reloggedContext.newPage()
        const modal = await openProcedureManager(page)
        await expect(procedureItem(modal, name)).toContainText('70 minutes')
        await expect(procedureItem(modal, name)).toContainText('Created by you')
      } finally {
        await reloggedContext.close()
      }

      const userBContext = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.userB.state })
      try {
        const page = await userBContext.newPage()
        const modal = await openProcedureManager(page)
        await expect(procedureItem(modal, name)).toContainText('70 minutes')
        await modal.getByRole('button', { name: 'Close' }).click()
        await page.getByRole('button', { name: 'Select Procedure' }).click()
        await page.getByPlaceholder('Search surgery types...').fill(name)
        await expect(page.getByRole('option', { name: fullValue, exact: true })).toBeVisible()
      } finally {
        await userBContext.close()
      }

      const finalRows = await listProcedures(accounts)
      expect(finalRows).toHaveLength(initialRows.length)
      expect(finalRows.filter((row) => row.name === name)).toHaveLength(1)
    } finally {
      await deleteProcedure(accounts, accounts.userA, procedure?.id)
    }
  })
})
