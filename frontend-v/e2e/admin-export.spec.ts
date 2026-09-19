import { test, expect, type Page, type Download } from '@playwright/test'

const isoDate = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const dateInMonth = (monthOffset: number, day: number) => {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate()
  firstDay.setDate(Math.min(day, lastDay))
  return isoDate(firstDay)
}

const bookings = [
  {
    id: 'b1', hn: '0433557', fullName: 'Alpha Patient', age: 40, gender: 'male',
    underlying: 'None', diagnosis: 'Diagnosis A', procedure: 'Procedure A',
    surgeryDetails: 'Details A', room: 'OR-201', date: dateInMonth(1, 1), status: 'Upcoming',
    doctorLicense: 'D-100', queueOrder: 1,
  },
  {
    id: 'b2', hn: '2000002', fullName: 'Beta Patient', age: 50, gender: 'female',
    underlying: 'Condition B', diagnosis: 'Diagnosis B', procedure: 'Procedure B',
    surgeryDetails: '', room: 'OR-202', date: dateInMonth(1, 31), status: 'Succeed',
    doctorLicense: 'D-200', queueOrder: 1,
  },
  {
    id: 'b3', hn: '2000003', fullName: 'Gamma Patient', age: 60, gender: 'male',
    underlying: '', diagnosis: '', procedure: 'Procedure C', surgeryDetails: '',
    room: 'OR-201', date: dateInMonth(2, 1), status: 'Cancelled', doctorLicense: 'D-100',
    queueOrder: 2,
  },
]

const doctors = [
  { license: 'D-100', doctorName: 'Dr Alpha', role: 'user' },
  { license: 'D-200', doctorName: 'Dr Beta', role: 'user' },
]

async function installApiFixtures(page: Page) {
  await page.route('**/api/bookings/export**', async (route) => {
    const url = new URL(route.request().url())
    const params = url.searchParams
    let rows = [...bookings]
    const id = params.get('id')
    if (id) rows = rows.filter((row) => row.id === id)

    const rooms = params.get('rooms')?.split(',').filter(Boolean) ?? []
    const doctorLicenses = params.get('doctors')?.split(',').filter(Boolean) ?? []
    const statuses = params.get('statuses')?.split(',').filter(Boolean) ?? []
    if (rooms.length) rows = rows.filter((row) => rooms.includes(row.room))
    if (doctorLicenses.length) rows = rows.filter((row) => doctorLicenses.includes(row.doctorLicense))
    if (statuses.length) rows = rows.filter((row) =>
      statuses.includes(row.status === 'Succeed' ? 'Completed' : row.status),
    )
    const from = params.get('from')
    const to = params.get('to')
    if (from) rows = rows.filter((row) => row.date >= from)
    if (to) rows = rows.filter((row) => row.date <= to)

    await route.fulfill({ json: rows })
  })

  await page.route('**/api/bookings', (route) => route.fulfill({ json: bookings }))
  await page.route('**/api/users**', (route) => {
    const isUsersList = new URL(route.request().url()).pathname.endsWith('/api/users')
    return route.fulfill({ json: isUsersList ? doctors : {} })
  })
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? ''
  await page.goto(`${baseURL}/admin-login`)
  await page.evaluate(() => {
    localStorage.setItem('isLoggedIn', 'true')
    localStorage.setItem('userRole', 'admin')
    localStorage.setItem('userLicense', 'admin-e2e')
    localStorage.setItem('authToken', 'playwright-admin-token')
  })
  await page.goto(`${baseURL}/admin-home`)
  await expect(page.locator('.btn-export')).toBeVisible()
}

async function csvFrom(download: Download) {
  const stream = await download.createReadStream()
  if (!stream) throw new Error('The CSV download did not provide a file stream')
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, '')
}

async function openExport(page: Page) {
  await page.locator('.btn-export').click()
  return page.getByRole('dialog', { name: 'Export All Bookings' })
}

test.describe('Admin system-wide CSV export', () => {
  test.beforeEach(async ({ page }) => installApiFixtures(page))

  test('opens with CSV, all dates, unselected filters, and exports all rows', async ({ page }) => {
    const dialog = await openExport(page)
    await expect(dialog.getByRole('button', { name: 'CSV (Spreadsheet)' })).toHaveClass(/active/)
    await expect(dialog.getByRole('button', { name: 'All dates' })).toHaveClass(/active/)
    await expect(dialog.getByText('3 booking(s) will be exported')).toBeVisible()
    await expect(dialog.getByText('Spreadsheet file for opening and editing in Excel')).toBeVisible()
    await expect(dialog.getByText('All', { exact: true })).toHaveCount(3)

    const downloadPromise = page.waitForEvent('download')
    await dialog.getByRole('button', { name: 'Download CSV' }).click()
    const download = await downloadPromise
    const csv = await csvFrom(download)
    const [header, ...dataRows] = csv.split('\r\n')
    expect(header.split(',')).toHaveLength(19)
    expect(header.split(',')).toEqual([
      'Queue order', 'HN', 'Full name', 'Age', 'Gender', 'Underlying condition',
      'Diagnosis', 'Procedure', 'Additional Surgery Details', 'Room', 'Surgery date',
      'Status', 'CXR (Date/Notes)', 'ECG (Date/Notes)', 'Lab (Date/Notes)',
      'Admission (Date/Notes)', 'Note', 'Doctor', 'Medical license',
    ])
    expect(dataRows).toHaveLength(3)
    expect(csv).toContain('"=""0433557"""')
    expect(csv).toContain(',Completed,')
    expect(csv).toContain('Dr Alpha,D-100')
    await expect(page.getByRole('heading', { name: /Downloaded 3 booking\(s\)/ })).toBeVisible()
    await expect(dialog).toBeHidden()
  })

  test('applies date range, room, doctor, and status filters together', async ({ page }) => {
    const dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'Date range' }).click()
    await dialog.locator('input[type="date"]').nth(0).fill(bookings[0].date)
    await dialog.locator('input[type="date"]').nth(1).fill(bookings[1].date)
    await dialog.getByRole('button', { name: 'OR-201', exact: true }).click()
    await dialog.getByRole('button', { name: 'Select doctors...' }).click()
    await dialog.getByLabel('Dr Alpha').check()
    await dialog.locator('.export-dropdown-toggle').click()
    await dialog.getByRole('button', { name: 'Upcoming', exact: true }).click()
    await expect(dialog.getByText('1 booking(s) will be exported')).toBeVisible()

    const downloadPromise = page.waitForEvent('download')
    await dialog.getByRole('button', { name: 'Download CSV' }).click()
    const csv = await csvFrom(await downloadPromise)
    expect(csv).toContain('Alpha Patient')
    expect(csv).not.toContain('Beta Patient')
    expect(csv).not.toContain('Gamma Patient')
    expect(csv).toContain('Upcoming')
  })

  test('daily and monthly scopes include their selected dates and exclude adjacent dates', async ({ page }) => {
    const dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'Daily' }).click()
    await dialog.locator('input[type="date"]').fill(bookings[0].date)
    await expect(dialog.getByText('1 booking(s) will be exported')).toBeVisible()
    let downloadPromise = page.waitForEvent('download')
    await dialog.getByRole('button', { name: 'Download CSV' }).click()
    let csv = await csvFrom(await downloadPromise)
    expect(csv).toContain('Alpha Patient')
    expect(csv).not.toContain('Beta Patient')

    await page.getByRole('button', { name: 'OK' }).click()
    const reopened = await openExport(page)
    await reopened.getByRole('button', { name: 'Monthly' }).click()
    await reopened.locator('input[type="month"]').fill(bookings[0].date.slice(0, 7))
    await expect(reopened.getByText('2 booking(s) will be exported')).toBeVisible()
    downloadPromise = page.waitForEvent('download')
    await reopened.getByRole('button', { name: 'Download CSV' }).click()
    csv = await csvFrom(await downloadPromise)
    expect(csv).toContain('Alpha Patient')
    expect(csv).toContain('Beta Patient')
    expect(csv).not.toContain('Gamma Patient')
  })

  test('multiple statuses return matching bookings and empty combinations disable download', async ({ page }) => {
    const dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'Completed', exact: true }).click()
    await dialog.getByRole('button', { name: 'Cancelled', exact: true }).click()
    await expect(dialog.getByText('2 booking(s) will be exported')).toBeVisible()
    let downloadPromise = page.waitForEvent('download')
    await dialog.getByRole('button', { name: 'Download CSV' }).click()
    let csv = await csvFrom(await downloadPromise)
    expect(csv).toContain('Completed')
    expect(csv).toContain('Cancelled')
    expect(csv).not.toContain('Upcoming')

    await page.getByRole('button', { name: 'OK' }).click()
    const reopened = await openExport(page)
    await reopened.getByRole('button', { name: 'OR-202', exact: true }).click()
    await reopened.getByRole('button', { name: 'Select doctors...' }).click()
    await reopened.getByLabel('Dr Alpha').check()
    await reopened.locator('.export-dropdown-toggle').click()
    await expect(reopened.getByText('No bookings found for the selected filters')).toBeVisible()
    await expect(reopened.getByRole('button', { name: 'Download CSV' })).toBeDisabled()
  })

  test('rejects an incomplete or reversed date range before downloading', async ({ page }) => {
    const dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'Date range' }).click()
    await expect(dialog.getByText('Select a start and end date')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Download CSV' })).toBeDisabled()
    await dialog.locator('input[type="date"]').nth(0).fill(bookings[1].date)
    await dialog.locator('input[type="date"]').nth(1).fill(bookings[0].date)
    await expect(dialog.getByText('Start date must be before the end date')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Download CSV' })).toBeDisabled()
  })

  test('single booking hides group filters and exports only the selected booking', async ({ page }) => {
    const dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'Single booking' }).click()
    await expect(dialog.getByText('Rooms', { exact: true })).toBeHidden()
    await expect(dialog.getByText('Doctors', { exact: true })).toBeHidden()
    await expect(dialog.getByText('Status', { exact: true })).toBeHidden()
    await expect(dialog.getByText('Select a booking to export')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Download CSV' })).toBeDisabled()
    await dialog.locator('select').selectOption('b2')

    const downloadPromise = page.waitForEvent('download')
    await dialog.getByRole('button', { name: 'Download CSV' }).click()
    const csv = await csvFrom(await downloadPromise)
    expect(csv).toContain('Beta Patient')
    expect(csv).not.toContain('Alpha Patient')
    expect(csv).not.toContain('Gamma Patient')
  })

  test('clear all filters restores the full all-dates CSV selection', async ({ page }) => {
    const dialog = await openExport(page)
    await dialog.getByRole('button', { name: 'Monthly' }).click()
    await dialog.locator('input[type="month"]').fill(bookings[0].date.slice(0, 7))
    await dialog.getByRole('button', { name: 'OR-201', exact: true }).click()
    await dialog.getByRole('button', { name: 'Cancelled', exact: true }).click()
    await dialog.getByRole('button', { name: 'Clear all filters' }).click()
    await expect(dialog.getByRole('button', { name: 'All dates' })).toHaveClass(/active/)
    await expect(dialog.getByRole('button', { name: 'CSV (Spreadsheet)' })).toHaveClass(/active/)
    await expect(dialog.getByText('3 booking(s) will be exported')).toBeVisible()
    await expect(dialog.getByText('All', { exact: true })).toHaveCount(3)
    await expect(dialog.locator('input[type="month"]')).toHaveCount(0)
  })
})
