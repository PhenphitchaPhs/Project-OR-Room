import {
  test as base,
  expect,
  request as apiRequest,
  type Download,
  type Locator,
  type Page,
} from '@playwright/test'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { readFile } from 'node:fs/promises'

type Booking = Record<string, unknown> & {
  id: number | string
  hn: string
  fullName: string
  date: string
  room: string
  doctorLicense: string
  status: string
}

type Snapshot = {
  rows: Booking[]
  license: string
  doctorName: string
  room: string
}

type State = {
  cookies: never[]
  origins: Array<{
    origin: string
    localStorage: Array<{ name: string; value: string }>
  }>
}

type PdfTextItem = { str: string; transform: number[] }
type PdfIdentity = { queue: string; hn: string; name: string }
type PdfResult = {
  filename: string
  text: string
  pages: string[]
  identities: PdfIdentity[]
  pageCount: number
}

const PDF_HEADERS = [
  'Queue order',
  'HN',
  'Patient name',
  'Age/Gender',
  'Diagnosis',
  'Procedure',
  'Additional Surgery Details',
  'Surgery date',
  'Room',
  'Status',
]

const compact = (value: unknown) => String(value ?? '').replace(/\s+/gu, '')

// PDFKit may encode Thai SARA AM either as one character or as decomposed glyphs.
const normalizePdfText = (value: unknown) => compact(value)
  .replace(/\u0e4d([\u0e48-\u0e4b]?)\u0e32/gu, '$1\u0e33')

const dash = (value: unknown) => {
  const text = String(value ?? '').trim()
  return text || '-'
}

const dateKey = (value: unknown) => String(value ?? '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || ''

const thaiMonths = [
  'Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.',
  'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.',
]

const reportDate = (value: unknown) => {
  const key = dateKey(value)
  if (!key) return '-'
  const [year, month, day] = key.split('-').map(Number)
  return `${day} ${thaiMonths[month! - 1]} ${year! + 543}`
}

const genderLabel = (value: unknown) => {
  const key = String(value ?? '').toLowerCase()
  if (key === 'male' || key === 'ชาย') return 'Male'
  if (key === 'female' || key === 'หญิง') return 'Female'
  return '-'
}

const pair = (date: unknown, note: unknown) => {
  const left = dash(date)
  const right = dash(note)
  if (left === '-' && right === '-') return '-'
  if (left === '-') return right
  if (right === '-') return left
  return `${left} / ${right}`
}

const surgeryDetails = (row: Booking) =>
  dash(row.surgeryDetails ?? row.additionalSurgeryDetails ?? row.additional_surgery_details)

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

const identities = (rows: Array<{ hn: string; name?: string; fullName?: string }>) =>
  rows.map((row) => JSON.stringify([
    normalizePdfText(row.hn),
    normalizePdfText(row.name ?? row.fullName),
  ])).sort()

function coverageGap(description: string) {
  base.info().annotations.push({ type: 'coverage-gap', description })
}

function readTableIdentities(items: PdfTextItem[]): PdfIdentity[] {
  const queueHeader = items.find((item) => item.str === 'Queue order' || item.str === 'Queue')
  const hnHeader = items.find((item) => item.str === 'HN')
  const nameHeader = items.find((item) => item.str === 'Patient name')
  const ageHeader = items.find((item) => item.str.startsWith('Age/'))
  if (!queueHeader || !hnHeader || !nameHeader || !ageHeader) return []

  const queueX = queueHeader.transform[4]!
  const hnX = hnHeader.transform[4]!
  const nameX = nameHeader.transform[4]!
  const ageX = ageHeader.transform[4]!
  const rows: PdfIdentity[] = []
  let current: PdfIdentity | undefined
  let inTable = false

  for (const item of items) {
    const text = item.str.trim()
    const x = item.transform[4]!
    if (Math.abs(x - queueX) < 1 && (text === 'Queue order' || text === 'Queue')) {
      inTable = true
      current = undefined
      continue
    }
    if (!inTable || !text) continue
    if (Math.abs(x - queueX) < 1 && /^\d+$/.test(text)) {
      current = { queue: text, hn: '', name: '' }
      rows.push(current)
      continue
    }
    if (text.startsWith('Page ') || x < queueX - 1) {
      current = undefined
      continue
    }
    if (!current) continue
    if (x >= hnX - 1 && x < nameX - 1) current.hn += item.str
    if (x >= nameX - 1 && x < ageX - 1) current.name += item.str
  }

  return rows.map((row) => ({
    ...row,
    hn: normalizePdfText(row.hn),
    name: normalizePdfText(row.name),
  }))
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
      throw new Error('Set LIVE_USER_EMAIL and LIVE_USER_PASSWORD locally before running User PDF live tests.')
    }

    const request = await apiRequest.newContext({ baseURL: 'https://project-or-room.vercel.app' })
    try {
      const response = await request.post('/api/login', { data: { email, password } })
      expect(response.status(), `Login must succeed for ${email}`).toBe(200)
      const login = await response.json() as {
        token: string
        user: { license: string; doctorName: string; role: string; orNumber?: string | number }
      }
      expect(login.user.role).toBe('user')
      const localStorage = [
        { name: 'authToken', value: login.token },
        { name: 'isLoggedIn', value: 'true' },
        { name: 'userLicense', value: login.user.license },
        { name: 'doctorName', value: login.user.doctorName },
        { name: 'userRole', value: login.user.role },
      ]
      if (login.user.orNumber) {
        localStorage.push({ name: 'orNumber', value: String(login.user.orNumber) })
      }
      await use({
        cookies: [],
        origins: [{ origin: 'https://project-or-room.vercel.app', localStorage }],
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
    const account = await page.evaluate(() => ({
      license: localStorage.getItem('userLicense') || '',
      doctorName: localStorage.getItem('doctorName') || '',
      room: localStorage.getItem('orNumber') || '-',
    }))
    expect(account.license).not.toBe('')
    expect(rows.every((row) => String(row.doctorLicense) === account.license),
      'The User bookings API must return only the signed-in doctor bookings').toBe(true)
    await use({ rows, ...account })
  },

  userB: async ({}, use) => {
    const email = process.env.LIVE_USER_B_EMAIL
    const password = process.env.LIVE_USER_B_PASSWORD || process.env.LIVE_USER_PASSWORD
    if (!email || !password) {
      throw new Error('Set LIVE_USER_B_EMAIL and LIVE_USER_B_PASSWORD locally before running User PDF isolation checks.')
    }

    const request = await apiRequest.newContext({ baseURL: 'https://project-or-room.vercel.app' })
    try {
      const loginResponse = await request.post('/api/login', { data: { email, password } })
      expect(loginResponse.status(), `Login must succeed for ${email}`).toBe(200)
      const login = await loginResponse.json() as {
        token: string
        user: { license: string; doctorName: string; role: string; orNumber?: string | number }
      }
      expect(login.user.role).toBe('user')
      const response = await request.get('/api/bookings', {
        headers: { Authorization: `Bearer ${login.token}` },
      })
      expect(response.status()).toBe(200)
      const rows = await response.json() as Booking[]
      expect(rows.every((row) => String(row.doctorLicense) === login.user.license),
        'User B bookings API must return only User B bookings').toBe(true)
      await use({
        rows,
        license: login.user.license,
        doctorName: login.user.doctorName,
        room: String(login.user.orNumber || '-'),
      })
    } finally {
      await request.dispose()
    }
  },
})

async function openPdfExport(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Export Bookings' })
  if (await dialog.isVisible()) {
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  }
  await page.locator('.btn-export').click()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: /PDF \(Report\)/ }).click()
  await expect(dialog.getByRole('button', { name: /PDF \(Report\)/ })).toHaveClass(/active/)
  return dialog
}

async function readPdf(download: Download): Promise<PdfResult> {
  expect(await download.failure()).toBeNull()
  const filename = download.suggestedFilename()
  expect(filename).toMatch(/\.pdf$/)
  const path = await download.path()
  expect(path).toBeTruthy()
  const bytes = await readFile(path!)
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
  await test.info().attach(filename, { path: path!, contentType: 'application/pdf' })

  const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true })
  try {
    const document = await task.promise
    const pages: string[] = []
    const normalizedPages: string[] = []
    const pdfRows: PdfIdentity[] = []

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const pdfPage = await document.getPage(pageNumber)
      const viewport = pdfPage.getViewport({ scale: 1 })
      expect(viewport.width).toBeCloseTo(595.28, 0)
      expect(viewport.height).toBeCloseTo(841.89, 0)
      const content = await pdfPage.getTextContent()
      const items = content.items.filter((item): item is typeof item & PdfTextItem => 'str' in item)
      const raw = items.map((item) => item.str).join(' ')
      pages.push(raw)
      normalizedPages.push(normalizePdfText(raw))
      pdfRows.push(...readTableIdentities(items))
      expect(normalizedPages.at(-1)).toContain(`Page${pageNumber}/${document.numPages}`)
    }

    await test.info().attach('PDF extracted text', {
      body: Buffer.from(pages.map((page, index) => `Page ${index + 1}\n${page}`).join('\n\n'), 'utf8'),
      contentType: 'text/plain',
    })
    return {
      filename,
      text: normalizedPages.join(''),
      pages: normalizedPages,
      identities: pdfRows,
      pageCount: document.numPages,
    }
  } finally {
    await task.destroy()
  }
}

async function downloadPdf(page: Page, dialog: Locator, expected: Booking[]) {
  expect(expected.length, 'A PDF download requires at least one matching live booking').toBeGreaterThan(0)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download PDF', exact: true }).click(),
  ])
  const result = await readPdf(download)
  await expect(page.getByRole('heading', {
    name: new RegExp(`Downloaded ${expected.length} booking\\(s\\)`),
  })).toBeVisible()
  await page.getByRole('button', { name: 'OK', exact: true }).click()
  await expect(dialog).toBeHidden()
  return result
}

function expectCommonHeader(pdf: PdfResult, snapshot: Snapshot, from: string, to = from) {
  expect(pdf.text).toContain('SurgeryQueueSummary')
  expect(pdf.text).toContain(normalizePdfText(`Doctor: ${snapshot.doctorName}`))
  expect(pdf.text).toContain(normalizePdfText(`Medical license: ${snapshot.license}`))
  expect(pdf.text).toContain(normalizePdfText(`Operating room: ${snapshot.room}`))
  const range = from === to ? reportDate(from) : `${reportDate(from)} - ${reportDate(to)}`
  expect(pdf.text).toContain(normalizePdfText(`Date range: ${range}`))
  expect(pdf.text).toMatch(/Printedat:\d{1,2}[A-Z][a-z]{2,3}\.\d{4}at\d{2}:\d{2}/)
}

function expectSingleDetails(pdf: PdfResult, row: Booking) {
  const expected = [
    'Queue order', '1',
    'HN', dash(row.hn),
    'Full name', dash(row.fullName),
    'Age / Gender', `${dash(row.age)} years / ${genderLabel(row.gender)}`,
    'Underlying condition', dash(row.underlying),
    'Diagnosis', dash(row.diagnosis),
    'Procedure', dash(row.procedure),
    'Additional Surgery Details', surgeryDetails(row),
    'Surgery date', reportDate(row.date),
    'Operating room', dash(row.room),
    'Status', dash(row.status),
    'CXR', pair(row.cxrDate, row.cxrNote),
    'ECG', pair(row.ecgDate, row.ecgNote),
    'Lab', pair(row.labDate, row.labNote),
    'Admission', pair(row.admDate, row.admNote),
    'Notes', dash(row.notes),
  ]
  for (const value of expected) {
    expect(pdf.text, `Single-booking PDF content for HN ${row.hn}`).toContain(normalizePdfText(value))
  }
  expect(pdf.identities).toHaveLength(0)
}

function expectRangeDetails(pdf: PdfResult, expected: Booking[]) {
  expect(pdf.text).toContain(`Totalcases:${expected.length}`)
  expect(pdf.text).toContain('Queuedetails')
  for (const header of PDF_HEADERS) expect(pdf.text).toContain(normalizePdfText(header))
  expect(pdf.identities).toHaveLength(expected.length)
  expect(pdf.identities.map((row) => Number(row.queue)).sort((a, b) => a - b))
    .toEqual(expected.map((_, index) => index + 1))
  expect(identities(pdf.identities)).toEqual(identities(expected))
}

test.describe('User PDF export — live backend', () => {
  test('TC-U10.1 ส่งออกคิวที่เลือกเป็นไฟล์ PDF', async ({ page, snapshot, userB }) => {
    test.skip(!snapshot.rows.length, 'The live User A account has no booking to export.')
    const selected = sortRows(snapshot.rows)[0]!
    const dialog = await openPdfExport(page)
    await dialog.getByRole('button', { name: 'Single booking', exact: true }).click()
    const select = dialog.locator('#export-case-select')
    const optionIds = await select.locator('option').evaluateAll((options) =>
      options.slice(1).map((option) => (option as { value: string }).value))
    expect(optionIds.sort()).toEqual(snapshot.rows.map((row) => String(row.id)).sort())
    const userBIds = new Set(userB.rows.map((row) => String(row.id)))
    expect(optionIds.some((id) => userBIds.has(id)),
      'User A must not see User B booking IDs in the PDF booking selector').toBe(false)

    await select.selectOption(String(selected.id))
    await expect(dialog.getByText('1 booking selected for export', { exact: true })).toBeVisible()
    const pdf = await downloadPdf(page, dialog, [selected])
    expectCommonHeader(pdf, snapshot, dateKey(selected.date))
    expectSingleDetails(pdf, selected)
    expect(pdf.filename).toMatch(new RegExp(`^report_${String(selected.hn).replace(/[^\wก-๙-]/gu, '-')}_${dateKey(selected.date).replace(/-/g, '')}_exported[0-9]{8}[.]pdf$`))

    for (const other of snapshot.rows.filter((row) => String(row.id) !== String(selected.id))) {
      if (String(other.hn) !== String(selected.hn)) expect(pdf.text).not.toContain(normalizePdfText(other.hn))
    }
  })

  test('TC-U10.2 ส่งออกหลายคิวตามช่วงวันที่เป็นไฟล์ PDF', async ({ page, snapshot, userB }) => {
    const dates = [...new Set(snapshot.rows.map((row) => dateKey(row.date)).filter(Boolean))].sort()
    test.skip(!dates.length, 'The live User A account has no booking dates to export.')
    const from = dates[0]!
    const to = dates.at(-1)!
    const expected = snapshot.rows.filter((row) => {
      const date = dateKey(row.date)
      return date >= from && date <= to
    })

    const dialog = await openPdfExport(page)
    const inputs = dialog.locator('input[type="date"]')
    await inputs.nth(0).fill(from)
    await inputs.nth(1).fill(to)
    await expect(dialog.getByText(`${expected.length} booking(s) will be exported (${from} to ${to})`, {
      exact: true,
    })).toBeVisible()
    const pdf = await downloadPdf(page, dialog, expected)
    expectCommonHeader(pdf, snapshot, from, to)
    expectRangeDetails(pdf, expected)
    expect(pdf.filename).toMatch(new RegExp(`^report_${snapshot.license}_${from.replace(/-/g, '')}(?:-${to.replace(/-/g, '')})?_exported[0-9]{8}[.]pdf$`))

    const sameDay = dates.find((date) => snapshot.rows.filter((row) => dateKey(row.date) === date).length > 0)!
    const sameDayRows = snapshot.rows.filter((row) => dateKey(row.date) === sameDay)
    const dayDialog = await openPdfExport(page)
    const dayInputs = dayDialog.locator('input[type="date"]')
    await dayInputs.nth(0).fill(sameDay)
    await dayInputs.nth(1).fill(sameDay)
    const dayPdf = await downloadPdf(page, dayDialog, sameDayRows)
    expectCommonHeader(dayPdf, snapshot, sameDay)
    expectRangeDetails(dayPdf, sameDayRows)

    if (!userB.rows.some((row) => {
      const date = dateKey(row.date)
      return date >= from && date <= to
    })) coverageGap('User B has no booking in User A selected range to exercise cross-user exclusion.')
  })

  test('TC-U10.3 ป้องกันการส่งออกเมื่อระบุช่วงวันที่ไม่ครบหรือไม่ถูกต้อง', async ({ page, snapshot }) => {
    test.skip(!snapshot.rows.length, 'A live booking is required to verify recovery after invalid dates.')
    const dialog = await openPdfExport(page)
    const inputs = dialog.locator('input[type="date"]')
    const button = dialog.getByRole('button', { name: 'Download PDF', exact: true })
    let downloads = 0
    const onDownload = () => { downloads += 1 }
    page.on('download', onDownload)
    try {
      await expect(dialog.getByText('Select a date range to export', { exact: true })).toBeVisible()
      await expect(button).toBeDisabled()
      const valid = dateKey(snapshot.rows[0]!.date)
      for (const [from, to] of [[valid, ''], ['', valid]]) {
        await inputs.nth(0).fill(from!)
        await inputs.nth(1).fill(to!)
        await expect(dialog.getByText('Select a date range to export', { exact: true })).toBeVisible()
        await expect(button).toBeDisabled()
      }
      await inputs.nth(0).fill('2099-02-28')
      await inputs.nth(1).fill('2099-02-01')
      await expect(dialog.getByText(/Start date must be before the end date/)).toBeVisible()
      await expect(button).toBeDisabled()
      expect(downloads).toBe(0)

      await inputs.nth(0).fill(valid)
      await inputs.nth(1).fill(valid)
      const expected = snapshot.rows.filter((row) => dateKey(row.date) === valid)
      const pdf = await downloadPdf(page, dialog, expected)
      expectRangeDetails(pdf, expected)
    } finally {
      page.off('download', onDownload)
    }
  })

  test('TC-U10.4 ไม่พบรายการจองตามขอบเขตที่เลือก', async ({ page, snapshot, userB }) => {
    test.skip(!snapshot.rows.length, 'A live booking is required to verify recovery after empty filters.')
    const dialog = await openPdfExport(page)
    await dialog.getByRole('button', { name: 'Single booking', exact: true }).click()
    await expect(dialog.getByText('Select a booking to export', { exact: true })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Download PDF', exact: true })).toBeDisabled()

    await dialog.getByRole('button', { name: 'Date range', exact: true }).click()
    const inputs = dialog.locator('input[type="date"]')
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
    await expect(dialog.getByRole('button', { name: 'Download PDF', exact: true })).toBeDisabled()

    const userBOnlyDate = [...new Set(userB.rows.map((row) => dateKey(row.date)).filter(Boolean))]
      .find((date) => !snapshot.rows.some((row) => dateKey(row.date) === date))
    if (userBOnlyDate) {
      await inputs.nth(0).fill(userBOnlyDate)
      await inputs.nth(1).fill(userBOnlyDate)
      await expect(dialog.getByText(`No bookings found between ${userBOnlyDate} and ${userBOnlyDate}`, {
        exact: true,
      })).toBeVisible()
      await expect(dialog.getByRole('button', { name: 'Download PDF', exact: true })).toBeDisabled()
    } else coverageGap('Live data has no date containing only User B bookings.')

    const valid = dateKey(snapshot.rows[0]!.date)
    await inputs.nth(0).fill(valid)
    await inputs.nth(1).fill(valid)
    const expected = snapshot.rows.filter((row) => dateKey(row.date) === valid)
    const pdf = await downloadPdf(page, dialog, expected)
    expectRangeDetails(pdf, expected)
  })

  test('TC-U10.5 ตรวจความถูกต้องของเนื้อหา รูปแบบ และการแบ่งหน้า PDF', async ({ page, snapshot }) => {
    test.skip(!snapshot.rows.length, 'The live User A account has no PDF data to validate.')
    const selected = sortRows(snapshot.rows)[0]!
    const singleDialog = await openPdfExport(page)
    await singleDialog.getByRole('button', { name: 'Single booking', exact: true }).click()
    await singleDialog.locator('#export-case-select').selectOption(String(selected.id))
    const singlePdf = await downloadPdf(page, singleDialog, [selected])
    expectCommonHeader(singlePdf, snapshot, dateKey(selected.date))
    expectSingleDetails(singlePdf, selected)

    const dates = snapshot.rows.map((row) => dateKey(row.date)).filter(Boolean).sort()
    const from = dates[0]!
    const to = dates.at(-1)!
    const rangeDialog = await openPdfExport(page)
    const inputs = rangeDialog.locator('input[type="date"]')
    await inputs.nth(0).fill(from)
    await inputs.nth(1).fill(to)
    const rangePdf = await downloadPdf(page, rangeDialog, snapshot.rows)
    expectCommonHeader(rangePdf, snapshot, from, to)
    expectRangeDetails(rangePdf, snapshot.rows)

    if (rangePdf.pageCount === 1) coverageGap('Live User A data does not produce a multi-page PDF.')
    if (!snapshot.rows.some((row) => /^0\d+$/.test(String(row.hn)))) {
      coverageGap('Live User A data has no numeric HN beginning with zero.')
    }
    const values = snapshot.rows.flatMap((row) => [row.fullName, row.diagnosis, row.procedure, row.notes])
      .map((value) => String(value || ''))
    if (!values.some((value) => /[ก-๙]/u.test(value))) coverageGap('Live User A data has no Thai text.')
    if (!values.some((value) => value.length > 40)) coverageGap('Live User A data has no long text field.')
    test.info().annotations.push({
      type: 'manual-check-required',
      description: 'Open the attached PDFs and Print Preview to confirm visual clipping, page breaks and Thai glyph rendering.',
    })
  })
})
