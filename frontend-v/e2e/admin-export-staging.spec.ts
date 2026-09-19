import { test, expect, type Page, type Download, type Locator, type Response } from '@playwright/test'

const apiURL = process.env.STAGING_API_URL?.replace(/\/$/, '')
const password = process.env.STAGING_E2E_PASSWORD
const isConfigured = !!apiURL && !!password

const ids = [9900001, 9900002, 9900003, 9900004, 9900005, 9900006, 9900007, 9900008, 9900009, 9900010]
const allRooms = ['OR-201', 'OR-202', 'OR-206', 'OR-209']
const csvHeaders = [
  'Queue order', 'HN', 'Full name', 'Age', 'Gender', 'Underlying condition',
  'Diagnosis', 'Procedure', 'Additional Surgery Details', 'Room', 'Surgery date',
  'Status', 'CXR (Date/Notes)', 'ECG (Date/Notes)', 'Lab (Date/Notes)',
  'Admission (Date/Notes)', 'Note', 'Doctor', 'Medical license',
]

async function openExport(page: Page) {
  await page.locator('.btn-export').click()
  const dialog = page.getByRole('dialog', { name: 'Export All Bookings' })
  await expect(dialog.getByText('10 booking(s) will be exported')).toBeVisible()
  return dialog
}

function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"'
        i += 1
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && source[i + 1] === '\n') i += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

async function readDownload(download: Download) {
  const stream = await download.createReadStream()
  if (!stream) throw new Error('CSV download produced no stream')
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return parseCsv(Buffer.concat(chunks).toString('utf8'))
}

async function downloadCsv(page: Page, dialog: Locator) {
  const download = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download CSV' }).click(),
  ]).then(([result]) => result)
  const matrix = await readDownload(download)
  const count = matrix.length - 1
  await expect(page.getByRole('heading', { name: new RegExp(`Downloaded ${count} booking\\(s\\)`) })).toBeVisible()
  await expect(dialog).toBeHidden()
  await page.getByRole('button', { name: 'OK' }).click()
  return { matrix, filename: download.suggestedFilename() }
}

async function chooseDoctor(dialog: Awaited<ReturnType<typeof openExport>>, name: string) {
  await dialog.getByRole('button', { name: 'Select doctors...' }).click()
  await dialog.getByLabel(name, { exact: true }).check()
  await dialog.locator('.export-dropdown-toggle').click()
}

async function adminGet<T>(page: Page, path: string): Promise<T> {
  return page.evaluate(async (requestPath) => {
    const token = localStorage.getItem('authToken')
    const response = await fetch(requestPath, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) throw new Error(`GET ${requestPath} returned ${response.status}`)
    return response.json()
  }, path) as Promise<T>
}

async function adminResponse(page: Page, path: string) {
  return page.evaluate(async (requestPath) => {
    const token = localStorage.getItem('authToken')
    const response = await fetch(requestPath, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    return { status: response.status, body: await response.json() }
  }, path)
}

const valueOrDash = (value: unknown) => value === null || value === undefined || String(value).trim() === ''
  ? '-'
  : String(value).trim()

function pairValue(date: unknown, note: unknown) {
  const dateText = valueOrDash(date)
  const noteText = valueOrDash(note)
  if (dateText === '-' && noteText === '-') return '-'
  if (dateText === '-') return noteText
  if (noteText === '-') return dateText
  return `${dateText} / ${noteText}`
}

function statusValue(value: unknown) {
  const status = String(value ?? '').toLowerCase()
  if (status === '' || status === 'upcoming') return 'Upcoming'
  if (status === 'complete' || status === 'completed' || status === 'succeed') return 'Completed'
  if (status === 'cancelled' || status === 'canceled') return 'Cancelled'
  return String(value)
}

test.describe('Admin system-wide CSV export — staging Worker and D1', () => {
  let adminToken = ''

  test.beforeAll(async ({ browser }) => {
    test.skip(!isConfigured, 'Set PLAYWRIGHT_STAGING=1 and use the local staging environment file.')
    test.skip(
      process.env.VITE_API_PROXY_TARGET?.replace(/\/$/, '') !== apiURL,
      'VITE_API_PROXY_TARGET must exactly match STAGING_API_URL to prevent calls to Production.',
    )

    const baseURL = process.env.PLAYWRIGHT_BASE_URL || (process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173')
    const context = await browser.newContext({ baseURL })
    const page = await context.newPage()
    const apiResponses = new Map<string, Response>()
    const captureApiResponse = (response: Response) => {
      const pathname = new URL(response.url()).pathname
      if (pathname === '/api/bookings' || pathname === '/api/users') apiResponses.set(pathname, response)
    }
    page.on('response', captureApiResponse)

    try {
      await page.goto('/admin-login')
      await page.getByPlaceholder('Name').fill('e2e-export-admin')
      await page.getByPlaceholder('Password').fill(password!)
      const loginResponsePromise = page.waitForResponse((response) =>
        new URL(response.url()).pathname === '/api/login' && response.request().method() === 'POST',
      )
      await page.getByRole('button', { name: 'Log in' }).click()
      const loginResponse = await loginResponsePromise
      const loginBody = loginResponse.status() === 200 ? await loginResponse.json() : await loginResponse.text()
      expect(
        loginResponse.status(),
        `POST /api/login failed (${loginResponse.status()}): ${JSON.stringify(loginBody)}. Check staging availability and local staging credentials.`,
      ).toBe(200)
      adminToken = loginBody.token
      expect(adminToken).toBeTruthy()

      await expect(page.locator('.btn-export')).toBeVisible()
      await expect.poll(() => apiResponses.has('/api/bookings') && apiResponses.has('/api/users')).toBe(true)
      const bookingsResponse = apiResponses.get('/api/bookings')!
      expect(bookingsResponse.status()).toBe(200)
      expect(apiResponses.get('/api/users')!.status()).toBe(200)
      await expect(await bookingsResponse.json()).toHaveLength(10)
    } finally {
      page.off('response', captureApiResponse)
      await context.close()
    }
  })

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token: string) => {
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userRole', 'admin')
      localStorage.setItem('userLicense', 'e2e-export-admin')
      localStorage.setItem('authToken', token)
    }, adminToken)

    const apiResponses = new Map<string, Response>()
    const captureApiResponse = (response: Response) => {
      const pathname = new URL(response.url()).pathname
      if (pathname === '/api/bookings' || pathname === '/api/users') apiResponses.set(pathname, response)
    }
    page.on('response', captureApiResponse)
    try {
      await page.goto('/admin-home')
      await expect(page.locator('.btn-export')).toBeVisible()
      await expect.poll(() => apiResponses.has('/api/bookings') && apiResponses.has('/api/users')).toBe(true)
      expect(apiResponses.get('/api/bookings')!.status()).toBe(200)
      expect(apiResponses.get('/api/users')!.status()).toBe(200)
    } finally {
      page.off('response', captureApiResponse)
    }
  })

  test('TC-06 opens with the required CSV defaults', async ({ page }) => {
    const dialog = await openExport(page)
    await expect(dialog.getByRole('button', { name: 'CSV (Spreadsheet)' })).toHaveClass(/active/)
    await expect(dialog.getByRole('button', { name: 'All dates' })).toHaveClass(/active/)
    await expect(dialog.getByText('10 booking(s) will be exported')).toBeVisible()
    await expect(dialog.getByText('Spreadsheet file for opening and editing in Excel')).toBeVisible()
    await expect(dialog.locator('.export-label-hint')).toHaveText(['All', 'All', 'All'])
  })

  test('TC-07 exports every booking for All dates and reports the downloaded count', async ({ page }) => {
    const dialog = await openExport(page)
    await expect(dialog.getByText('10 booking(s) will be exported')).toBeVisible()
    const { matrix, filename } = await downloadCsv(page, dialog)
    expect(filename).toMatch(/^bookings_all_exported\d{8}\.csv$/)
    expect(matrix).toHaveLength(11)
    expect(matrix[0]).toEqual(csvHeaders)
    expect(matrix.slice(1).map((row) => row[2])).toContain('E2E Export Alpha')
  })

  test('TC-08 Daily exports only bookings on the selected date', async ({ page }) => {
    const dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'Daily' }).click()
    await dialog.locator('input[type="date"]').fill('2099-02-15')
    await expect(dialog.getByText('2 booking(s) will be exported')).toBeVisible()
    const { matrix } = await downloadCsv(page, dialog)
    const dateColumn = csvHeaders.indexOf('Surgery date')
    expect(matrix.slice(1).map((row) => row[dateColumn])).toEqual(['2099-02-15', '2099-02-15'])
    expect(matrix.map((row) => row[2])).toContain('E2E Export Epsilon')
    expect(matrix.map((row) => row[2])).toContain('E2E Export Kappa')
    expect(matrix.map((row) => row[2])).not.toContain('E2E Export Zeta')
  })

  test('TC-09 Monthly includes the first and last days and excludes adjacent months', async ({ page }) => {
    const dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'Monthly' }).click()
    await dialog.locator('input[type="month"]').fill('2099-02')
    await expect(dialog.getByText('8 booking(s) will be exported')).toBeVisible()
    const { matrix } = await downloadCsv(page, dialog)
    const dates = matrix.slice(1).map((row) => row[csvHeaders.indexOf('Surgery date')])
    expect(dates).toContain('2099-02-01')
    expect(dates).toContain('2099-02-28')
    expect(dates.every((date) => date.startsWith('2099-02-'))).toBe(true)
    expect(dates).not.toContain('2099-01-31')
    expect(dates).not.toContain('2099-03-01')
  })

  test('TC-10 Date range includes both boundary dates and excludes adjacent dates', async ({ page }) => {
    const dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'Date range' }).click()
    await dialog.locator('input[type="date"]').nth(0).fill('2099-02-01')
    await dialog.locator('input[type="date"]').nth(1).fill('2099-02-28')
    await expect(dialog.getByText('8 booking(s) will be exported')).toBeVisible()
    const { matrix } = await downloadCsv(page, dialog)
    const dates = matrix.slice(1).map((row) => row[csvHeaders.indexOf('Surgery date')])
    expect(dates).toContain('2099-02-01')
    expect(dates).toContain('2099-02-28')
    expect(dates.every((date) => date >= '2099-02-01' && date <= '2099-02-28')).toBe(true)
    expect(dates).not.toContain('2099-01-31')
    expect(dates).not.toContain('2099-03-01')
  })

  test('TC-11 incomplete Date range keeps download disabled for either missing endpoint', async ({ page }) => {
    const dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'Date range' }).click()
    const dates = dialog.locator('input[type="date"]')
    const download = dialog.getByRole('button', { name: 'Download CSV' })
    await dates.nth(0).fill('2099-02-01')
    await expect(dialog.getByText('Select a start and end date')).toBeVisible()
    await expect(download).toBeDisabled()
    await dates.nth(0).fill('')
    await dates.nth(1).fill('2099-02-28')
    await expect(dialog.getByText('Select a start and end date')).toBeVisible()
    await expect(download).toBeDisabled()
  })

  test('TC-12 reversed Date range is rejected before download by UI and API', async ({ page }) => {
    const dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'Date range' }).click()
    await dialog.locator('input[type="date"]').nth(0).fill('2099-02-28')
    await dialog.locator('input[type="date"]').nth(1).fill('2099-02-01')
    await expect(dialog.getByText('Start date must be before the end date')).toBeVisible()
    await expect(dialog.getByText(/booking\(s\) will be exported/)).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: 'Download CSV' })).toBeDisabled()
    const result = await adminResponse(page, '/api/bookings/export?from=2099-02-28&to=2099-02-01')
    expect(result.status).toBe(400)
    expect(result.body).toMatchObject({ error: 'Start date must be before or equal to end date' })
  })

  test('TC-13 Single Booking hides group filters and exports only the selected booking', async ({ page }) => {
    const dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'Single booking' }).click()
    await expect(dialog.getByText('Rooms', { exact: true })).toBeHidden()
    await expect(dialog.getByText('Doctors', { exact: true })).toBeHidden()
    await expect(dialog.getByText('Status', { exact: true })).toBeHidden()
    await expect(dialog.getByText('Select a booking to export')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Download CSV' })).toBeDisabled()
    await dialog.locator('select').selectOption('9900001')
    await expect(dialog.getByText('1 booking(s) will be exported')).toBeVisible()
    const { matrix, filename } = await downloadCsv(page, dialog)
    expect(matrix).toHaveLength(2)
    expect(matrix[1][2]).toBe('E2E Export Alpha')
    expect(filename).toMatch(/^booking_0433557_20990201_exported\d{8}\.csv$/)
  })

  test('TC-14 single room filter returns that room only and can be toggled off', async ({ page }) => {
    const dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'OR-202', exact: true }).click()
    await expect(dialog.getByText('1 room(s) selected')).toBeVisible()
    await expect(dialog.getByText('2 booking(s) will be exported')).toBeVisible()
    const roomColumn = csvHeaders.indexOf('Room')
    const { matrix } = await downloadCsv(page, dialog)
    expect(matrix.slice(1).map((row) => row[roomColumn])).toEqual(['OR-202', 'OR-202'])

    const reopened = await openExport(page)
    const room = reopened.getByRole('button', { name: 'OR-202', exact: true })
    await room.click()
    await room.click()
    await expect(reopened.getByText('All', { exact: true }).first()).toBeVisible()
    await expect(reopened.getByText('10 booking(s) will be exported')).toBeVisible()
  })

  test('TC-15 multiple room filter uses OR and can toggle each room off', async ({ page }) => {
    const dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'OR-202', exact: true }).click()
    await dialog.getByRole('button', { name: 'OR-206', exact: true }).click()
    await expect(dialog.getByText('2 room(s) selected')).toBeVisible()
    await expect(dialog.getByText('5 booking(s) will be exported')).toBeVisible()
    const { matrix } = await downloadCsv(page, dialog)
    const rooms = matrix.slice(1).map((row) => row[csvHeaders.indexOf('Room')])
    expect(new Set(rooms)).toEqual(new Set(['OR-202', 'OR-206']))
    expect(rooms).toHaveLength(5)

    const reopened = await openExport(page)
    await reopened.getByRole('button', { name: 'OR-202', exact: true }).click()
    await reopened.getByRole('button', { name: 'OR-206', exact: true }).click()
    await reopened.getByRole('button', { name: 'OR-202', exact: true }).click()
    await reopened.getByRole('button', { name: 'OR-206', exact: true }).click()
    await expect(reopened.getByText('10 booking(s) will be exported')).toBeVisible()
  })

  test('TC-16 single doctor filter exports its real name and license', async ({ page }) => {
    const dialog = await openExport(page)
    await chooseDoctor(dialog, 'Dr E2E Alpha')
    await expect(dialog.getByText('2 booking(s) will be exported')).toBeVisible()
    const { matrix } = await downloadCsv(page, dialog)
    const doctor = csvHeaders.indexOf('Doctor')
    const license = csvHeaders.indexOf('Medical license')
    expect(matrix.slice(1).map((row) => row[doctor])).toEqual(['Dr E2E Alpha', 'Dr E2E Alpha'])
    expect(matrix.slice(1).map((row) => row[license])).toEqual(['e2e-export-doctor-a', 'e2e-export-doctor-a'])
  })

  test('TC-17 multiple doctor filter includes both names and excludes other doctors', async ({ page }) => {
    const dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'Select doctors...' }).click()
    await dialog.getByLabel('Dr E2E Alpha', { exact: true }).check()
    await dialog.getByLabel('Dr E2E Beta', { exact: true }).check()
    await dialog.locator('.export-dropdown-toggle').click()
    await expect(dialog.getByText('6 booking(s) will be exported')).toBeVisible()
    const { matrix } = await downloadCsv(page, dialog)
    const names = matrix.slice(1).map((row) => row[csvHeaders.indexOf('Doctor')])
    expect(new Set(names)).toEqual(new Set(['Dr E2E Alpha', 'Dr E2E Beta']))
    expect(names).toHaveLength(6)
  })

  test('TC-18 Upcoming exports only Upcoming and the status chip toggles off', async ({ page }) => {
    const dialog = await openExport(page)
    const status = dialog.getByRole('button', { name: 'Upcoming', exact: true })
    await status.click()
    await expect(dialog.getByText('6 booking(s) will be exported')).toBeVisible()
    const { matrix } = await downloadCsv(page, dialog)
    expect(matrix.slice(1).every((row) => row[csvHeaders.indexOf('Status')] === 'Upcoming')).toBe(true)

    const reopened = await openExport(page)
    const again = reopened.getByRole('button', { name: 'Upcoming', exact: true })
    await again.click()
    await again.click()
    await expect(reopened.getByText('10 booking(s) will be exported')).toBeVisible()
  })

  test('TC-19 Completed includes legacy Succeed rows and exports the Completed label', async ({ page }) => {
    const dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'Completed', exact: true }).click()
    await expect(dialog.getByText('3 booking(s) will be exported')).toBeVisible()
    const { matrix } = await downloadCsv(page, dialog)
    expect(matrix.slice(1).every((row) => row[csvHeaders.indexOf('Status')] === 'Completed')).toBe(true)

    const reopened = await openExport(page)
    const status = reopened.getByRole('button', { name: 'Completed', exact: true })
    await status.click()
    await status.click()
    await expect(reopened.getByText('10 booking(s) will be exported')).toBeVisible()
  })

  test('TC-20 Cancelled exports only cancelled bookings and the status chip toggles off', async ({ page }) => {
    const dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'Cancelled', exact: true }).click()
    await expect(dialog.getByText('1 booking(s) will be exported')).toBeVisible()
    const { matrix } = await downloadCsv(page, dialog)
    expect(matrix.slice(1).map((row) => row[csvHeaders.indexOf('Status')])).toEqual(['Cancelled'])

    const reopened = await openExport(page)
    const status = reopened.getByRole('button', { name: 'Cancelled', exact: true })
    await status.click()
    await status.click()
    await expect(reopened.getByText('10 booking(s) will be exported')).toBeVisible()
  })

  test('TC-21 selecting all three statuses includes all status values', async ({ page }) => {
    const dialog = await openExport(page)
    for (const status of ['Upcoming', 'Completed', 'Cancelled']) {
      await dialog.getByRole('button', { name: status, exact: true }).click()
    }
    await expect(dialog.getByText('10 booking(s) will be exported')).toBeVisible()
    const { matrix } = await downloadCsv(page, dialog)
    expect(new Set(matrix.slice(1).map((row) => row[csvHeaders.indexOf('Status')]))).toEqual(
      new Set(['Upcoming', 'Completed', 'Cancelled']),
    )
  })

  test('TC-22 status combinations match the real staging database in successive exports', async ({ page }) => {
    let dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'Cancelled', exact: true }).click()
    let result = await downloadCsv(page, dialog)
    expect(result.matrix.slice(1).map((row) => row[csvHeaders.indexOf('Status')])).toEqual(['Cancelled'])

    dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'Upcoming', exact: true }).click()
    await dialog.getByRole('button', { name: 'Completed', exact: true }).click()
    await expect(dialog.getByText('9 booking(s) will be exported')).toBeVisible()
    result = await downloadCsv(page, dialog)
    expect(new Set(result.matrix.slice(1).map((row) => row[csvHeaders.indexOf('Status')]))).toEqual(
      new Set(['Upcoming', 'Completed']),
    )

    dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'Completed', exact: true }).click()
    const databaseRows = await adminGet<Array<{ status: string }>>(page, '/api/bookings/export?statuses=Completed')
    await expect(dialog.getByText(`${databaseRows.length} booking(s) will be exported`)).toBeVisible()
    result = await downloadCsv(page, dialog)
    expect(result.matrix.length - 1).toBe(databaseRows.length)
    expect(databaseRows).toHaveLength(3)
  })

  test('TC-23 room, doctor, status, and date filters combine with AND across groups', async ({ page }) => {
    const dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'Date range' }).click()
    await dialog.locator('input[type="date"]').nth(0).fill('2099-02-01')
    await dialog.locator('input[type="date"]').nth(1).fill('2099-02-28')
    await dialog.getByRole('button', { name: 'OR-206', exact: true }).click()
    await chooseDoctor(dialog, 'Dr E2E Gamma')
    await dialog.getByRole('button', { name: 'Upcoming', exact: true }).click()
    await expect(dialog.getByText('1 booking(s) will be exported')).toBeVisible()
    const { matrix } = await downloadCsv(page, dialog)
    expect(matrix).toHaveLength(2)
    expect(matrix[1][2]).toBe('E2E Export Epsilon')
    expect(matrix[1][csvHeaders.indexOf('Room')]).toBe('OR-206')
    expect(matrix[1][csvHeaders.indexOf('Doctor')]).toBe('Dr E2E Gamma')
    expect(matrix[1][csvHeaders.indexOf('Status')]).toBe('Upcoming')
    expect(matrix[1][csvHeaders.indexOf('Surgery date')]).toBe('2099-02-15')
  })

  test('TC-24 room and doctor choices come from staging data and the empty-doctor state is clear', async ({ page }) => {
    const realBookings = await adminGet<Array<{ room: string }>>(page, '/api/bookings')
    const realUsers = await adminGet<Array<{ doctorName: string; role: string }>>(page, '/api/users')
    const expectedRooms = [...new Set(realBookings.map((booking) => booking.room))].sort()
    const expectedDoctors = realUsers.filter((user) => user.role === 'user').map((user) => user.doctorName).sort()
    expect(expectedRooms).toEqual(allRooms)
    expect(expectedDoctors).toEqual(['Dr E2E Alpha', 'Dr E2E Beta', 'Dr E2E Gamma'])

    const dialog = await openExport(page)
    const roomOptions = await dialog.locator('.export-chip-box').first().locator('button').allTextContents()
    expect(roomOptions).toEqual(expectedRooms)
    await dialog.getByRole('button', { name: 'Select doctors...' }).click()
    const doctorOptions = await dialog.locator('.export-dropdown-item:not(.export-dropdown-item-all)').allTextContents()
    expect(doctorOptions.map((name) => name.trim())).toEqual(expectedDoctors)

    await page.route('**/api/users', (route) => route.fulfill({ json: [] }))
    await page.reload()
    await expect(page.locator('.btn-export')).toBeVisible()
    const emptyDoctorsDialog = await openExport(page)
    await emptyDoctorsDialog.getByRole('button', { name: 'Select doctors...' }).click()
    await expect(emptyDoctorsDialog.getByText('No doctors available')).toBeVisible()
  })

  test('TC-25 filters with no matching booking disable download and show an empty result', async ({ page }) => {
    const dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'OR-201', exact: true }).click()
    await chooseDoctor(dialog, 'Dr E2E Gamma')
    await expect(dialog.getByText('No bookings found for the selected filters')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Download CSV' })).toBeDisabled()
  })

  test('TC-26 Clear all filters restores the initial CSV and full booking count', async ({ page }) => {
    const dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'Monthly' }).click()
    await dialog.locator('input[type="month"]').fill('2099-02')
    await dialog.getByRole('button', { name: 'OR-206', exact: true }).click()
    await chooseDoctor(dialog, 'Dr E2E Gamma')
    await dialog.getByRole('button', { name: 'Completed', exact: true }).click()
    await expect(dialog.getByText('1 booking(s) will be exported')).toBeVisible()
    await dialog.getByRole('button', { name: 'Clear all filters' }).click()
    await expect(dialog.getByRole('button', { name: 'All dates' })).toHaveClass(/active/)
    await expect(dialog.getByRole('button', { name: 'CSV (Spreadsheet)' })).toHaveClass(/active/)
    await expect(dialog.locator('input[type="date"]')).toHaveCount(0)
    await expect(dialog.locator('input[type="month"]')).toHaveCount(0)
    await expect(dialog.locator('.export-label-hint')).toHaveText(['All', 'All', 'All'])
    await expect(dialog.getByText('10 booking(s) will be exported')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Download CSV' })).toBeEnabled()
  })

  test('TC-27 preview count, download count, and every exported field match D1 without omissions or duplicates', async ({ page }) => {
    const expectedBookings = await adminGet<Array<Record<string, unknown>>>(page, '/api/bookings/export')
    const users = await adminGet<Array<{ license: string; doctorName: string }>>(page, '/api/users')
    const doctorNames = Object.fromEntries(users.map((user) => [user.license, user.doctorName]))
    const dialog = await openExport(page)
    await expect(dialog.getByText(`${expectedBookings.length} booking(s) will be exported`)).toBeVisible()
    const { matrix } = await downloadCsv(page, dialog)
    expect(matrix[0]).toEqual(csvHeaders)
    const rows = matrix.slice(1)
    expect(rows).toHaveLength(expectedBookings.length)
    expect(new Set(rows.map((row) => row[csvHeaders.indexOf('HN')])).size).toBe(expectedBookings.length)

    const exportByHn = new Map(rows.map((row) => [row[csvHeaders.indexOf('HN')].slice(2, -1), row]))
    for (const booking of expectedBookings) {
      const hn = String(booking.hn)
      const row = exportByHn.get(hn)
      expect(row, `CSV should contain HN ${hn}`).toBeDefined()
      expect(row).toEqual([
        String(rows.indexOf(row!) + 1),
        `="${hn}"`,
        valueOrDash(booking.fullName),
        valueOrDash(booking.age),
        String(booking.gender).toLowerCase() === 'male' ? 'Male' : String(booking.gender).toLowerCase() === 'female' ? 'Female' : '-',
        valueOrDash(booking.underlying),
        valueOrDash(booking.diagnosis),
        valueOrDash(booking.procedure),
        valueOrDash(booking.surgeryDetails ?? booking.additionalSurgeryDetails ?? booking.additional_surgery_details),
        valueOrDash(booking.room),
        valueOrDash(booking.date),
        statusValue(booking.status),
        pairValue(booking.cxrDate, booking.cxrNote),
        pairValue(booking.ecgDate, booking.ecgNote),
        pairValue(booking.labDate, booking.labNote),
        pairValue(booking.admDate, booking.admNote),
        valueOrDash(booking.notes),
        valueOrDash(doctorNames[String(booking.doctorLicense ?? '')]),
        valueOrDash(booking.doctorLicense),
      ])
    }
  })

  test('TC-28 CSV contains the required 19 columns in order', async ({ page }) => {
    const dialog = await openExport(page)
    const { matrix } = await downloadCsv(page, dialog)
    expect(matrix[0]).toHaveLength(19)
    expect(matrix[0]).toEqual(csvHeaders)
  })

  test('TC-29 numeric HN with a leading zero stays intact in the Excel text value', async ({ page }) => {
    const dialog = await openExport(page)
    const { matrix } = await downloadCsv(page, dialog)
    const hn = matrix.slice(1).find((row) => row[csvHeaders.indexOf('Full name')] === 'E2E Export Alpha')
      ?.[csvHeaders.indexOf('HN')]
    expect(hn).toBe('="0433557"')
  })
})
