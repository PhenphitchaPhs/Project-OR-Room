import {
  test as base,
  expect,
  request as apiRequest,
  type BrowserContext,
  type Download,
  type Locator,
  type Page,
} from '@playwright/test'
import { readFile } from 'node:fs/promises'

type Booking = Record<string, unknown> & {
  id: number | string
  hn: string
  fullName: string
  date: string
  doctorLicense: string
}

type Snapshot = {
  rows: Booking[]
  license: string
}

type State = Awaited<ReturnType<BrowserContext['storageState']>>

const csvHeaders = [
  'Queue order',
  'HN',
  'Full name',
  'Age',
  'Gender',
  'Underlying condition',
  'Diagnosis',
  'Procedure',
  'Additional Surgery Details',
  'Room',
  'Surgery date',
  'Status',
  'CXR (Date/Notes)',
  'ECG (Date/Notes)',
  'Lab (Date/Notes)',
  'Admission (Date/Notes)',
  'Note',
]

const dash = (value: unknown) => value == null || String(value).trim() === '' ? '-' : String(value).trim()

const dateKey = (value: unknown) => {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] || ''
}

const genderLabel = (value: unknown) => {
  const key = String(value || '').toLowerCase()
  if (key === 'male' || key === 'ชาย') return 'Male'
  if (key === 'female' || key === 'หญิง') return 'Female'
  return '-'
}

const statusLabels: Record<string, string> = {
  succeed: 'Completed',
  complete: 'Completed',
  completed: 'Completed',
  upcoming: 'Upcoming',
  cancelled: 'Cancelled',
  canceled: 'Cancelled',
}

const statusLabel = (value: unknown) => {
  const key = String(value || 'Upcoming').toLowerCase().trim()
  return statusLabels[key] || String(value)
}

const pairLabel = (date: unknown, note: unknown) => {
  const values = [dash(date), dash(note)].filter((value) => value !== '-')
  return values.join(' / ') || '-'
}

const surgeryDetails = (row: Booking) =>
  dash(row.surgeryDetails ?? row.additionalSurgeryDetails ?? row.additional_surgery_details)

const excelHn = (value: unknown) => {
  const text = dash(value)
  return /^\d+$/.test(text) ? `="${text}"` : text
}

const sortRows = (rows: Booking[]) => [...rows].sort((a, b) => {
  const byDate = dateKey(a.date).localeCompare(dateKey(b.date))
  if (byDate) return byDate
  const byQueue = (Number(a.queueOrder) || 999) - (Number(b.queueOrder) || 999)
  if (byQueue) return byQueue
  const byAge = (Number(b.age) || 0) - (Number(a.age) || 0)
  if (byAge) return byAge
  if (a.gender !== b.gender) return a.gender === 'female' ? -1 : 1
  return 0
})

function expectedCsv(rows: Booking[]) {
  return sortRows(rows).map((row, index) => [
    String(index + 1),
    excelHn(row.hn),
    dash(row.fullName),
    dash(row.age),
    genderLabel(row.gender),
    dash(row.underlying),
    dash(row.diagnosis),
    dash(row.procedure),
    surgeryDetails(row),
    dash(row.room),
    dateKey(row.date) || '-',
    statusLabel(row.status),
    pairLabel(row.cxrDate, row.cxrNote),
    pairLabel(row.ecgDate, row.ecgNote),
    pairLabel(row.labDate, row.labNote),
    pairLabel(row.admDate, row.admNote),
    dash(row.notes),
  ])
}

function parseCsv(raw: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const text = raw.replace(/^\uFEFF/, '')

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"'
        index += 1
      } else quoted = !quoted
    } else if (!quoted && char === ',') {
      row.push(cell)
      cell = ''
    } else if (!quoted && (char === '\r' || char === '\n')) {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += char
  }

  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

async function loginUser(context: BrowserContext, email: string, password: string) {
  const page = await context.newPage()
  await page.goto('/login')
  await page.getByPlaceholder('Email Address').fill(email)
  await page.getByPlaceholder('Password').fill(password)
  const [response] = await Promise.all([
    page.waitForResponse((result) =>
      new URL(result.url()).pathname === '/api/login' && result.request().method() === 'POST'),
    page.getByRole('button', { name: 'Log in', exact: true }).click(),
  ])
  expect(response.status(), `Login must succeed for ${email}`).toBe(200)
  await expect(page.locator('.btn-export')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('userRole'))).toBe('user')
  return page
}

const test = base.extend<{
  snapshot: Snapshot
  userB: Snapshot
}, {
  userState: State
}>({
  userState: [async ({}, use) => {
    const email = process.env.LIVE_USER_EMAIL
    const password = process.env.LIVE_USER_PASSWORD
    if (!email || !password) {
      throw new Error('Set LIVE_USER_EMAIL and LIVE_USER_PASSWORD locally before running User CSV live tests.')
    }

    const request = await apiRequest.newContext({
      baseURL: 'https://project-or-room.vercel.app',
    })
    try {
      const response = await request.post('/api/login', {
        data: { email, password },
      })
      expect(response.status(), `Login must succeed for ${email}`).toBe(200)
      const login = await response.json() as {
        token: string
        user: { license: string; doctorName: string; role: string }
      }
      expect(login.user.role).toBe('user')
      await use({
        cookies: [],
        origins: [{
          origin: 'https://project-or-room.vercel.app',
          localStorage: [
            { name: 'authToken', value: login.token },
            { name: 'isLoggedIn', value: 'true' },
            { name: 'userLicense', value: login.user.license },
            { name: 'doctorName', value: login.user.doctorName },
            { name: 'userRole', value: login.user.role },
          ],
        }],
      })
    } finally {
      await request.dispose()
    }
  }, { scope: 'worker' }],

  storageState: async ({ userState }, use) => use(userState),

  snapshot: async ({ page }, use) => {
    const responsePromise = page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/api/bookings' && response.request().method() === 'GET')
    await page.goto('/home')
    const response = await responsePromise
    expect(response.status()).toBe(200)
    await expect(page.locator('.btn-export')).toBeVisible()

    const rows = await response.json() as Booking[]
    const license = await page.evaluate(() => localStorage.getItem('userLicense') || '')
    expect(Array.isArray(rows)).toBe(true)
    expect(license).not.toBe('')
    expect(rows.every((row) => String(row.doctorLicense) === license),
      'The User bookings API must not expose another doctor’s bookings').toBe(true)
    await use({ rows, license })
  },

  userB: async ({}, use) => {
    const email = process.env.LIVE_USER_B_EMAIL
    const password = process.env.LIVE_USER_B_PASSWORD || process.env.LIVE_USER_PASSWORD
    if (!email || !password) {
      throw new Error('Set LIVE_USER_B_EMAIL and LIVE_USER_B_PASSWORD locally before running User isolation checks.')
    }

    const request = await apiRequest.newContext({
      baseURL: 'https://project-or-room.vercel.app',
    })
    try {
      const loginResponse = await request.post('/api/login', {
        data: { email, password },
      })
      expect(loginResponse.status(), `Login must succeed for ${email}`).toBe(200)
      const login = await loginResponse.json() as {
        token: string
        user: { license: string; role: string }
      }
      expect(login.user.role).toBe('user')
      const response = await request.get('/api/bookings', {
        headers: { Authorization: `Bearer ${login.token}` },
      })
      expect(response.status()).toBe(200)
      const rows = await response.json() as Booking[]
      const license = login.user.license
      expect(license).not.toBe('')
      expect(rows.every((row) => String(row.doctorLicense) === license),
        'User B bookings API must return only User B bookings').toBe(true)
      await use({ rows, license })
    } finally {
      await request.dispose()
    }
  },
})

function coverageGap(description: string) {
  test.info().annotations.push({ type: 'coverage-gap', description })
}

async function openCsvExport(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Export Bookings' })
  if (await dialog.isVisible()) await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.locator('.btn-export').click()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: /CSV \(Spreadsheet\)/ }).click()
  return dialog as Locator
}

async function downloadAndCheck(page: Page, dialog: Locator, expected: Booking[]) {
  expect(expected.length, 'A CSV download requires at least one matching live booking').toBeGreaterThan(0)
  const [download] = await Promise.all([
    page.waitForEvent('download') as Promise<Download>,
    dialog.getByRole('button', { name: 'Download CSV', exact: true }).click(),
  ])

  expect(await download.failure()).toBeNull()
  expect(download.suggestedFilename()).toMatch(/\.csv$/)
  const path = await download.path()
  expect(path).toBeTruthy()
  const bytes = await readFile(path!)
  expect([...bytes.subarray(0, 3)], 'CSV must start with a UTF-8 BOM for Excel').toEqual([0xef, 0xbb, 0xbf])

  const matrix = parseCsv(bytes.toString('utf8'))
  expect(matrix[0]).toEqual(csvHeaders)
  expect(matrix.length - 1).toBe(expected.length)
  expect(matrix.slice(1)).toEqual(expectedCsv(expected))

  await test.info().attach(download.suggestedFilename(), {
    path: path!,
    contentType: 'text/csv',
  })
  await expect(page.getByRole('heading', {
    name: new RegExp(`Downloaded ${expected.length} booking\\(s\\)`),
  })).toBeVisible()
  await page.getByRole('button', { name: 'OK', exact: true }).click()
  await expect(dialog).toBeHidden()
  return matrix
}

test.describe('User CSV export — live backend', () => {
  test('TC-U09.1 ส่งออกคิวที่เลือกเป็นไฟล์ CSV', async ({ page, snapshot, userB }) => {
    test.skip(!snapshot.rows.length, 'The live User account has no booking to export.')
    const selected = sortRows(snapshot.rows)[0]!
    const dialog = await openCsvExport(page)
    await dialog.getByRole('button', { name: 'Single booking', exact: true }).click()

    const select = dialog.locator('#export-case-select')
    const optionIds = await select.locator('option').evaluateAll((options) =>
      options.slice(1).map((option) => (option as { value: string }).value))
    expect(optionIds.sort()).toEqual(snapshot.rows.map((row) => String(row.id)).sort())
    const userBIds = new Set(userB.rows.map((row) => String(row.id)))
    expect(optionIds.some((id) => userBIds.has(id)),
      'User A must not see User B booking IDs in the Single booking list').toBe(false)
    await select.selectOption(String(selected.id))
    await expect(dialog.getByText('1 booking selected for export', { exact: true })).toBeVisible()
    const matrix = await downloadAndCheck(page, dialog, [selected])
    expect(matrix).toHaveLength(2)
  })

  test('TC-U09.2 ป้องกันการส่งออกเมื่อยังไม่ได้เลือกคิวหรือบัญชีไม่มีคิว', async ({ page, snapshot }) => {
    expect(snapshot.license).not.toBe('')
    const dialog = await openCsvExport(page)
    await dialog.getByRole('button', { name: 'Single booking', exact: true }).click()
    await expect(dialog.getByText('Select a booking to export', { exact: true })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Download CSV', exact: true })).toBeDisabled()

    const emptyEmail = process.env.LIVE_EMPTY_USER_EMAIL
    const emptyPassword = process.env.LIVE_EMPTY_USER_PASSWORD
    if (!emptyEmail || !emptyPassword) {
      coverageGap('Set LIVE_EMPTY_USER_EMAIL and LIVE_EMPTY_USER_PASSWORD to exercise a real User account with no bookings.')
      return
    }

    const context = await page.context().browser()!.newContext({
      baseURL: 'https://project-or-room.vercel.app',
    })
    try {
      const emptyPage = await loginUser(context, emptyEmail, emptyPassword)
      const responsePromise = emptyPage.waitForResponse((response) =>
        new URL(response.url()).pathname === '/api/bookings' && response.request().method() === 'GET')
      await emptyPage.reload()
      const response = await responsePromise
      expect(await response.json()).toEqual([])
      const emptyDialog = await openCsvExport(emptyPage)
      await emptyDialog.getByRole('button', { name: 'Single booking', exact: true }).click()
      await expect(emptyDialog.getByText('No bookings available', { exact: true })).toBeVisible()
      await expect(emptyDialog.getByRole('button', { name: 'Download CSV', exact: true })).toBeDisabled()
    } finally {
      await context.close()
    }
  })

  test('TC-U09.3 ส่งออกคิวของผู้ใช้ตามช่วงวันที่แบบรวมวันเริ่มต้นและสิ้นสุด', async ({ page, snapshot, userB }) => {
    const dates = [...new Set(snapshot.rows.map((row) => dateKey(row.date)).filter(Boolean))].sort()
    test.skip(dates.length < 2, 'At least two live booking dates are required for an inclusive date-range check.')
    const from = dates[0]!
    const to = dates.length >= 3 ? dates.at(-2)! : dates.at(-1)!
    const expected = snapshot.rows.filter((row) => {
      const date = dateKey(row.date)
      return date >= from && date <= to
    })
    expect(expected.some((row) => dateKey(row.date) === from)).toBe(true)
    expect(expected.some((row) => dateKey(row.date) === to)).toBe(true)

    const dialog = await openCsvExport(page)
    const inputs = dialog.locator('input[type="date"]')
    await inputs.nth(0).fill(from)
    await inputs.nth(1).fill(to)
    await expect(dialog.getByText(`${expected.length} booking(s) will be exported (${from} to ${to})`, {
      exact: true,
    })).toBeVisible()
    await downloadAndCheck(page, dialog, expected)

    if (!userB.rows.some((row) => {
      const date = dateKey(row.date)
      return date >= from && date <= to
    })) coverageGap('User B has no live booking inside User A’s selected date range.')
    if (dates.length < 3) coverageGap('Live data has no booking outside the selected boundary range.')
  })

  test('TC-U09.4 ป้องกันวันที่ไม่ครบ ช่วงวันที่ไม่ถูกต้อง และช่วงที่ไม่มีคิว', async ({ page, snapshot }) => {
    test.skip(!snapshot.rows.length, 'A live booking is required to verify recovery after invalid filters.')
    const dialog = await openCsvExport(page)
    const inputs = dialog.locator('input[type="date"]')
    const downloadButton = dialog.getByRole('button', { name: 'Download CSV', exact: true })

    await expect(dialog.getByText('Select a date range to export', { exact: true })).toBeVisible()
    await expect(downloadButton).toBeDisabled()

    const validDate = dateKey(snapshot.rows[0]!.date)
    await inputs.nth(0).fill(validDate)
    await expect(dialog.getByText('Select a date range to export', { exact: true })).toBeVisible()
    await expect(downloadButton).toBeDisabled()
    await inputs.nth(0).fill('')
    await inputs.nth(1).fill(validDate)
    await expect(dialog.getByText('Select a date range to export', { exact: true })).toBeVisible()
    await expect(downloadButton).toBeDisabled()

    await inputs.nth(0).fill('2099-02-28')
    await inputs.nth(1).fill('2099-02-01')
    await expect(dialog.getByText('⚠️ Start date must be before the end date', { exact: true })).toBeVisible()
    await expect(downloadButton).toBeDisabled()

    let emptyDate = '2099-01-01'
    while (snapshot.rows.some((row) => dateKey(row.date) === emptyDate)) {
      const next = new Date(`${emptyDate}T00:00:00Z`)
      next.setUTCDate(next.getUTCDate() + 1)
      emptyDate = next.toISOString().slice(0, 10)
    }
    await inputs.nth(0).fill(emptyDate)
    await inputs.nth(1).fill(emptyDate)
    await expect(dialog.getByText(`No bookings found between ${emptyDate} and ${emptyDate}`, {
      exact: true,
    })).toBeVisible()
    await expect(downloadButton).toBeDisabled()

    await inputs.nth(0).fill(validDate)
    await inputs.nth(1).fill(validDate)
    const expected = snapshot.rows.filter((row) => dateKey(row.date) === validDate)
    await downloadAndCheck(page, dialog, expected)
  })

  test('TC-U09.5 ตรวจข้อมูล จำนวนรายการ และรูปแบบไฟล์ CSV', async ({ page, snapshot }) => {
    test.skip(!snapshot.rows.length, 'The live User account has no CSV data to validate.')
    const selected = sortRows(snapshot.rows)[0]!

    const singleDialog = await openCsvExport(page)
    await singleDialog.getByRole('button', { name: 'Single booking', exact: true }).click()
    await singleDialog.locator('#export-case-select').selectOption(String(selected.id))
    await downloadAndCheck(page, singleDialog, [selected])

    const dates = snapshot.rows.map((row) => dateKey(row.date)).filter(Boolean).sort()
    const from = dates[0]!
    const to = dates.at(-1)!
    const rangeDialog = await openCsvExport(page)
    const inputs = rangeDialog.locator('input[type="date"]')
    await inputs.nth(0).fill(from)
    await inputs.nth(1).fill(to)
    const matrix = await downloadAndCheck(page, rangeDialog, snapshot.rows)

    const leadingZeroIndex = snapshot.rows.findIndex((row) => /^0\d+$/.test(String(row.hn)))
    if (leadingZeroIndex >= 0) {
      const hn = String(sortRows(snapshot.rows).find((row) => /^0\d+$/.test(String(row.hn)))!.hn)
      expect(matrix.slice(1).some((row) => row[1] === `="${hn}"`)).toBe(true)
    } else coverageGap('Live User data has no numeric HN beginning with zero.')

    const values = snapshot.rows.flatMap((row) => [row.fullName, row.underlying, row.diagnosis, row.notes])
      .map((value) => String(value || ''))
    if (!values.some((value) => /[ก-๙]/.test(value))) coverageGap('Live User data has no Thai text to exercise UTF-8 display.')
    if (!values.some((value) => /[",\r\n]/.test(value))) coverageGap('Live User data has no comma, quote, or multiline field.')
    test.info().annotations.push({
      type: 'manual-check-required',
      description: 'Open an attached CSV in Microsoft Excel to confirm the visual display of Thai text and leading-zero HNs.',
    })
  })
})
