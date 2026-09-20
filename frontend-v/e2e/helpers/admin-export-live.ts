import { test as base, expect, type Page, type Locator, type BrowserContext } from '@playwright/test'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { readFile } from 'node:fs/promises'

// Live exports only. No seed, delete, edit, cancellation or simulated API responses.
type Booking = Record<string, unknown> & { id: number | string; hn: string; fullName: string; date: string; room: string; doctorLicense: string; status: string }
type Doctor = { license: string; doctorName: string; role: string }
type Snapshot = { rows: Booking[]; doctors: Doctor[] }
type State = Awaited<ReturnType<BrowserContext['storageState']>>
type Format = 'CSV' | 'PDF'
const compact = (text: string) => text.replace(/\s+/gu, '')
// Compare equivalent composed/decomposed Thai SARA AM spellings. Do not
// remove duplicated vowels or substitute Latin letters from corrupt PDFs.
const normalizePdfText = (text: string) => compact(text)
  .replace(/\u0e4d([\u0e48-\u0e4b]?)\u0e32/gu, '$1\u0e33')

type PdfTextItem = { str: string; transform: number[] }
type PdfBookingIdentity = { queue: string; hn: string; name: string }

function readPdfBookingIdentities(items: PdfTextItem[]): PdfBookingIdentity[] {
  // Use column positions and row boundaries, not substring matches across the document.
  const queueHeader = items.find((item) => ['Qu', 'Queue'].includes(item.str))
  const hnHeader = items.find((item) => item.str === 'HN')
  const nameHeader = items.find((item) => item.str === 'Patient name')
  const ageHeader = items.find((item) => item.str.startsWith('Age/'))
  expect(queueHeader && hnHeader && nameHeader && ageHeader,
    'PDF table headers must identify the Queue, HN, Patient name and Age columns').toBeTruthy()
  const queueX = queueHeader!.transform[4]!
  const hnX = hnHeader!.transform[4]!
  const nameX = nameHeader!.transform[4]!
  const ageX = ageHeader!.transform[4]!
  const rows: PdfBookingIdentity[] = []
  let current: PdfBookingIdentity | undefined
  let inTable = false
  for (const item of items) {
    const x = item.transform[4]!
    if (Math.abs(x - queueX) < 1 && ['Qu', 'Queue'].includes(item.str)) {
      inTable = true
      current = undefined
      continue
    }
    if (!inTable || !item.str.trim()) continue
    if (Math.abs(x - queueX) < 1 && /^\d+$/.test(item.str.trim())) {
      current = { queue: item.str.trim(), hn: '', name: '' }
      rows.push(current)
      continue
    }
    // Group titles and footers end the previous row.
    if (item.str.startsWith('Page ') || x < queueX - 1) {
      current = undefined
      continue
    }
    if (!current) continue
    if (x >= hnX - 1 && x < nameX - 1) current.hn += item.str
    if (x >= nameX - 1 && x < ageX - 1) current.name += item.str
  }
  return rows.map((row) => ({ ...row, hn: normalizePdfText(row.hn), name: normalizePdfText(row.name) }))
}
const status = (value: unknown) => ({ succeed: 'Completed', complete: 'Completed', completed: 'Completed', upcoming: 'Upcoming', cancelled: 'Cancelled', canceled: 'Cancelled' }[String(value || 'Upcoming').toLowerCase()] || String(value))
const dash = (value: unknown) => value == null || String(value).trim() === '' ? '-' : String(value).trim()
// Numeric HNs use Excel text syntax to preserve leading zeros. Mixed text stays literal.
const expectedCsvHn = (value: unknown): string => {
  const text = dash(value)
  return /^\d+$/.test(text) ? `="${text}"` : text
}
const headers = ['Queue order', 'HN', 'Full name', 'Age', 'Gender', 'Underlying condition', 'Diagnosis', 'Procedure', 'Additional Surgery Details', 'Room', 'Surgery date', 'Status', 'CXR (Date/Notes)', 'ECG (Date/Notes)', 'Lab (Date/Notes)', 'Admission (Date/Notes)', 'Note', 'Doctor', 'Medical license']

const test = base.extend<{ snapshot: Snapshot }, { adminState: State }>({
  adminState: [async ({ browser }, use) => {
    const username = process.env.LIVE_ADMIN_USERNAME || 'admin007'
    const password = process.env.LIVE_ADMIN_PASSWORD
    if (!password) throw new Error('Set LIVE_ADMIN_PASSWORD for admin007 locally before running live tests.')
    const context = await browser.newContext({ baseURL: 'https://project-or-room.vercel.app' })
    try {
      const page = await context.newPage()
      await page.goto('/admin-login')
      await page.getByPlaceholder('Name').fill(username)
      await page.getByPlaceholder('Password').fill(password)
      const [response] = await Promise.all([
        page.waitForResponse((r) => new URL(r.url()).pathname === '/api/login' && r.request().method() === 'POST'),
        page.getByRole('button', { name: 'Log in', exact: true }).click(),
      ])
      expect(response.status(), 'Live Admin login must succeed').toBe(200)
      await expect(page.locator('.btn-export')).toBeVisible()
      expect(await page.evaluate(() => localStorage.getItem('userRole'))).toBe('admin')
      await use(await context.storageState())
    } finally { await context.close() }
  }, { scope: 'worker' }],
  storageState: async ({ adminState }, use) => { await use(adminState) },
  snapshot: async ({ page }, use) => {
    const [bookings, users] = await Promise.all([
      page.waitForResponse((r) => new URL(r.url()).pathname === '/api/bookings' && r.request().method() === 'GET'),
      page.waitForResponse((r) => new URL(r.url()).pathname === '/api/users' && r.request().method() === 'GET'),
      page.goto('/admin-home'),
    ])
    expect(bookings.status()).toBe(200)
    expect(users.status()).toBe(200)
    await expect(page.locator('.btn-export')).toBeVisible()
    const rows = await bookings.json()
    const doctors = await users.json()
    expect(Array.isArray(rows)).toBe(true)
    expect(Array.isArray(doctors)).toBe(true)
    await use({ rows, doctors })
  },
})

function parseCsv(raw: string) {
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  const text = raw.replace(/^\uFEFF/, '')
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted
    } else if (!quoted && ch === ',') { row.push(cell); cell = '' }
    else if (!quoted && (ch === '\r' || ch === '\n')) {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += ch
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows
}

function coverageGap(description: string) {
  test.info().annotations.push({ type: 'coverage-gap', description })
}

async function open(page: Page, format: Format) {
  const dialog = page.getByRole('dialog', { name: 'Export All Bookings' })
  if (await dialog.isVisible()) await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.locator('.btn-export').click()
  await dialog.getByRole('button', { name: format === 'CSV' ? 'CSV (Spreadsheet)' : 'PDF (Report)' }).click()
  return dialog
}

async function exportAndCheck(page: Page, dialog: Locator, format: Format, expected: Booking[], snapshot: Snapshot) {
  test.skip(!expected.length, 'No matching live bookings for this export; not a pass.')
  await expect(dialog.getByText(`${expected.length} booking(s) will be exported`)).toBeVisible()
  const [download, response] = await Promise.all([
    page.waitForEvent('download'),
    page.waitForResponse((r) => new URL(r.url()).pathname === '/api/bookings/export' && r.request().method() === 'GET'),
    dialog.getByRole('button', { name: `Download ${format}`, exact: true }).click(),
  ])
  expect(response.status()).toBe(200)
  const actual: Booking[] = await response.json()
  const ids = (rows: Booking[]) => rows.map((row) => String(row.id)).sort()
  expect(ids(actual), 'Export IDs must match the loaded booking list and selected filters; concurrent changes may require rerun').toEqual(ids(expected))
  expect(await download.failure()).toBeNull()
  expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${format.toLowerCase()}$`))
  const path = await download.path()
  const bytes = await readFile(path!)
  await test.info().attach(download.suggestedFilename(), { path: path!, contentType: format === 'CSV' ? 'text/csv' : 'application/pdf' })
  if (format === 'CSV') {
    const matrix = parseCsv(bytes.toString('utf8'))
    expect(matrix[0]).toEqual(headers)
    expect(matrix.length - 1).toBe(expected.length)
    const pair = (date: unknown, note: unknown) => [dash(date), dash(note)].filter((v) => v !== '-').join(' / ') || '-'
    // Compare multisets of full rows, allowing repeat HNs for different bookings.
    const expectedCells = expected.map((row) => [
      expectedCsvHn(row.hn), dash(row.fullName), dash(row.age),
      ['male', 'ชาย'].includes(String(row.gender)) ? 'Male' : ['female', 'หญิง'].includes(String(row.gender)) ? 'Female' : '-',
      dash(row.underlying), dash(row.diagnosis), dash(row.procedure), dash(row.surgeryDetails ?? row.additionalSurgeryDetails ?? row.additional_surgery_details),
      dash(row.room), row.date.slice(0, 10), status(row.status), pair(row.cxrDate, row.cxrNote), pair(row.ecgDate, row.ecgNote),
      pair(row.labDate, row.labNote), pair(row.admDate, row.admNote), dash(row.notes),
      dash(snapshot.doctors.find((doctor) => doctor.license === row.doctorLicense)?.doctorName), dash(row.doctorLicense),
    ])
    expect(matrix.slice(1).map((row) => JSON.stringify(row.slice(1))).sort()).toEqual(expectedCells.map((row) => JSON.stringify(row)).sort())
    expect(matrix.slice(1).map((row) => Number(row[0])).sort((a, b) => a - b)).toEqual(expected.map((_, i) => i + 1))
  } else {
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
    const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true })
    try {
      const doc = await task.promise
      const texts: string[] = []
      const extractedPages: string[] = []
      const pdfRows: PdfBookingIdentity[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        const pdfPage = await doc.getPage(i)
        const content = await pdfPage.getTextContent()
        const items = content.items.filter((item) => 'str' in item)
        // A summary-only page may precede the detail table.
        if (items.some((item) => item.str === 'Patient name')) pdfRows.push(...readPdfBookingIdentities(items))
        const extracted = content.items.filter((item) => 'str' in item).map((item) => item.str).join(' ')
        extractedPages.push(`Page ${i}\n${extracted}`)
        const text = normalizePdfText(extracted)
        texts.push(text)
        expect(text).toContain(`Page${i}/${doc.numPages}`)
        expect(pdfPage.getViewport({ scale: 1 }).width).toBeCloseTo(595.28, 0)
        expect(pdfPage.getViewport({ scale: 1 }).height).toBeCloseTo(841.89, 0)
      }
      const text = texts.join('')
      await test.info().attach('PDF extracted text', {
        body: Buffer.from(extractedPages.join('\n\n'), 'utf8'),
        contentType: 'text/plain',
      })
      expect(text).toContain('System-wideSurgeryQueueSummary')
      expect(text).toContain(`Totalcases:${expected.length}`)
      expect(text).toContain(`Printedby:${process.env.LIVE_ADMIN_USERNAME || 'admin007'}`)
      const detailsStart = text.indexOf('Queuedetails')
      expect(detailsStart, 'PDF must contain the Queue details section').toBeGreaterThanOrEqual(0)
      expect(pdfRows.length, 'PDF detail-row count must match the selected bookings').toBe(expected.length)
      expect(pdfRows.map((row) => Number(row.queue)).sort((a, b) => a - b),
        'PDF queue numbers must appear once each',
      ).toEqual(expected.map((_, index) => index + 1))
      const identities = (rows: { hn: string; name: string }[]) => rows.map((row) => JSON.stringify([row.hn, row.name])).sort()
      expect(identities(pdfRows),
        'Exact HN/name pairs from PDF cells must match API bookings, including duplicate counts. Inspect the raw PDF text for font mapping errors.',
      ).toEqual(identities(expected.map((row) => ({ hn: normalizePdfText(dash(row.hn)), name: normalizePdfText(dash(row.fullName)) }))))
      if (doc.numPages === 1) coverageGap('Multi-page layout was not exercised by this live export.')
    } finally { await task.destroy() }
  }
  await expect(page.getByRole('heading', { name: new RegExp(`Downloaded ${expected.length} booking\\(s\\)`) })).toBeVisible()
  await page.getByRole('button', { name: 'OK', exact: true }).click()
  await expect(dialog).toBeHidden()
}


export { test, expect, coverageGap, open, exportAndCheck, status }
