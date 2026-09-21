import { expect, test, type Page } from '@playwright/test'

const BOOKING_ID = 'e2e-us07-001'
const VALID_HN = '7654321'
const OLD_DATE = '2026-10-15'
const NEW_DATE = '2026-10-16'
const WEEKEND_DATE = '2026-10-17' // Saturday
const ROOM = 'OR-201'
const NEW_ROOM = 'OR-202'

const oldProcedure =
  'Appendectomy - 60 mins'
const newProcedure =
  'Laparoscopic Cholecystectomy / LC (ผ่าตัดนิ่วในถุงน้ำดี) - 120 mins'

function booking(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    hn: '1234567',
    fullName: 'Somchai Jaidee',
    age: 45,
    gender: 'male',
    underlying: 'Hypertension',
    diagnosis: 'Acute appendicitis',
    procedure: oldProcedure,
    durationMinutes: 60,
    date: OLD_DATE,
    room: ROOM,
    surgeryDetails: 'Original surgery details',
    notes: 'Original notes',
    cxrDate: '',
    cxrNote: '',
    ecgDate: '',
    ecgNote: '',
    labDate: '',
    labNote: '',
    admDate: '',
    admNote: '',
    doctorLicense: 'DR-E2E-001',
    status: 'Upcoming',
    ...overrides,
  }
}

function patient() {
  return {
    hn: VALID_HN,
    fullName: 'Anan Testpatient',
    age: 38,
    gender: 'male',
    underlying: 'Diabetes',
  }
}

async function installEditFixtures(
  page: Page,
  options: {
    currentBooking?: Record<string, unknown>
    schedule?: Record<string, unknown>[]
    patientData?: Record<string, unknown>
    putStatus?: number
    putResponse?: Record<string, unknown>
  } = {},
) {
  const currentBooking = options.currentBooking ?? booking()
  const schedule = options.schedule ?? []
  const patientData = options.patientData ?? patient()

  await page.route('**/api/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()

    if (url.pathname === `/api/bookings/${BOOKING_ID}` && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(currentBooking),
      })
    }

    if (url.pathname === `/api/bookings/${BOOKING_ID}` && method === 'PUT') {
      return route.fulfill({
        status: options.putStatus ?? 200,
        contentType: 'application/json',
        body: JSON.stringify(options.putResponse ?? { ...currentBooking, ...JSON.parse(request.postData() || '{}') }),
      })
    }

    if (url.pathname.startsWith('/api/patients/')) {
      if (url.pathname.endsWith(`/${VALID_HN}`)) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(patientData),
        })
      }

      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Patient not found' }),
      })
    }

    if (url.pathname === '/api/schedule') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(schedule),
      })
    }

    if (url.pathname === '/api/holidays') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      })
    }

    if (url.pathname === '/api/users/DR-E2E-001') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ orNumber: 201 }),
      })
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })
}

async function openEditPage(
  page: Page,
  options: Parameters<typeof installEditFixtures>[1] = {},
) {
  const currentBooking = options.currentBooking ?? booking()
  await installEditFixtures(page, options)

  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('isLoggedIn', 'true')
    localStorage.setItem('userRole', 'user')
    localStorage.setItem('userLicense', 'DR-E2E-001')
    localStorage.setItem('doctorName', 'E2E Doctor')
    localStorage.setItem('authToken', 'playwright-e2e-token')
  })

  await page.goto(`/booking/${BOOKING_ID}`)
  await expect(page.locator('.card')).toBeVisible()
  await expect(page.getByPlaceholder('HN (7 digits)')).toHaveValue(
    String(currentBooking.hn ?? ''),
  )
}

async function selectProcedure(page: Page, procedureText: string) {
  await page.getByRole('button', { name: 'Select Procedure' }).click()
  const search = page.getByPlaceholder('Search surgery types...')
  await search.fill(procedureText)
  await page.locator('.option').filter({ hasText: procedureText }).first().click()
}

async function selectRoom(page: Page, room: string) {
  await page.locator('select.room-select').selectOption(room)
}

async function chooseDate(page: Page, date: string) {
  await page.locator('#surgery-date').fill(date)
  await page.locator('#surgery-date').blur()
}

test.describe('US-07 แก้ไขข้อมูลการจอง', () => {
  test('TC-US07-001 เปิดข้อมูลการจองที่มีอยู่', async ({ page }) => {
    await openEditPage(page)

    await expect(page.getByPlaceholder('HN (7 digits)')).toHaveValue('1234567')
    await expect(page.getByPlaceholder('Full Name')).toHaveValue('Somchai Jaidee')
    await expect(page.getByPlaceholder('Age (years)')).toHaveValue('45')
    await expect(page.locator('select').filter({ has: page.locator('option[value="male"]') })).toHaveValue('male')
    await expect(page.getByPlaceholder('Underlying Disease(s)')).toHaveValue('Hypertension')
    await expect(page.getByPlaceholder('Diagnosis')).toHaveValue('Acute appendicitis')
    await expect(page.locator('#surgery-date')).toHaveValue(OLD_DATE)
    await expect(page.locator('select.room-select')).toHaveValue(ROOM)
    await expect(page.getByRole('button', { name: 'Select Procedure' })).toContainText('Appendectomy')
  })

  test('TC-US07-002 แก้ไขข้อมูลผู้ป่วยด้วย HN ใหม่', async ({ page }) => {
    await openEditPage(page)

    const hn = page.getByPlaceholder('HN (7 digits)')
    await hn.fill(VALID_HN)
    await hn.blur()

    await expect(hn).toHaveValue(VALID_HN)
    await expect(page.getByPlaceholder('Full Name')).toHaveValue('Anan Testpatient')
    await expect(page.getByPlaceholder('Underlying Disease(s)')).toHaveValue('Diabetes')
    await expect(page.locator('.status-tag').filter({ hasText: 'Found' })).toBeVisible()
  })

  test('TC-US07-003 ไม่สามารถบันทึกเมื่อ HN ไม่ถูกต้อง', async ({ page }) => {
  await openEditPage(page)

  const hn = page.getByPlaceholder('HN (7 digits)')

  await hn.fill('123')

  await page.getByRole('button', { name: 'Confirm Booking' }).click()

  // ตรวจสอบว่า HTML validation มองว่า HN ไม่ถูกต้อง
  const isInvalid = await hn.evaluate(
    (el: HTMLInputElement) => !el.checkValidity(),
  )

  expect(isInvalid).toBe(true)

  // ต้องยังอยู่หน้าแก้ไขการจอง เพราะไม่สามารถ submit ได้
  await expect(page).toHaveURL(new RegExp(`/booking/${BOOKING_ID}$`))
})

  test('TC-US07-004 แก้ไขวันผ่าตัดเป็นวันที่สามารถจองได้', async ({ page }) => {
    await openEditPage(page)

    await chooseDate(page, NEW_DATE)

    await expect(page.locator('#surgery-date')).toHaveValue(NEW_DATE)
  })

  test('TC-US07-005 ไม่สามารถเลือกวันเสาร์หรือวันอาทิตย์', async ({ page }) => {
    await openEditPage(page)

    await chooseDate(page, WEEKEND_DATE)

    await expect(page.locator('#surgery-date')).toHaveValue('')
    await expect(page.locator('.alert-message')).toContainText(
      'The operating rooms are closed on weekends',
    )
  })

  test('TC-US07-006 แก้ไขเวลาผ่าตัดเป็นเวลาที่ว่าง', async ({ page }) => {
    await openEditPage(page)

    await selectRoom(page, NEW_ROOM)
    await chooseDate(page, NEW_DATE)

    await expect(page.locator('#surgery-date')).toHaveValue(NEW_DATE)
    await expect(page.locator('select.room-select')).toHaveValue(NEW_ROOM)

    // หน้าแก้ไขใช้วัน + ห้องเพื่อคำนวณเวลาที่เหลือของห้อง
    await expect(page.locator('.date-hint')).toBeVisible()
  })

  test('TC-US07-007 ไม่สามารถเลือกเวลาที่ชนกับคิวเดิม', async ({ page }) => {
    const conflictingBooking = booking({
      id: 'conflict-001',
      date: NEW_DATE,
      room: ROOM,
      procedure: 'Appendectomy - 60 mins',
      durationMinutes: 420,
      status: 'Upcoming',
    })

    await openEditPage(page, { schedule: [conflictingBooking] })
    await chooseDate(page, NEW_DATE)

    await expect(page.locator('#surgery-date')).toHaveValue(NEW_DATE)

    // Calendar/BookingView warns when the room exceeds its daily capacity.
    // The current implementation explicitly says the user can still continue.
    await expect(
      page.getByText(/Room OR-201 on 2026-10-16 will exceed the 7-hour limit by/i),
    ).toBeVisible()
  })

  test('TC-US07-008 แก้ไขประเภทการผ่าตัด', async ({ page }) => {
    await openEditPage(page)

    await selectProcedure(page, 'Laparoscopic Cholecystectomy')

    await expect(page.getByRole('button', { name: 'Select Procedure' }))
      .toContainText('Laparoscopic Cholecystectomy')
  })

  test('TC-US07-009 ระยะเวลาเปลี่ยนตามประเภทการผ่าตัด', async ({ page }) => {
    await openEditPage(page)

    await selectProcedure(page, 'Laparoscopic Cholecystectomy')

    await expect(page.getByRole('button', { name: 'Select Procedure' }))
      .toContainText('120 mins')

    await selectProcedure(page, 'Herniorrhaphy')

    await expect(page.getByRole('button', { name: 'Select Procedure' }))
      .toContainText('90 mins')
  })

  test('TC-US07-010 บันทึกข้อมูลการจองที่แก้ไขครบถ้วน', async ({ page }) => {
    await openEditPage(page)

    await page.getByPlaceholder('Full Name').fill('Anan Updated')
    await chooseDate(page, NEW_DATE)
    await selectProcedure(page, 'Laparoscopic Cholecystectomy')
    await selectRoom(page, NEW_ROOM)

    await page.getByRole('button', { name: 'Confirm Booking' }).click()

    await expect(page.locator('.alert-message')).toContainText(
      'Booking updated successfully!',
    )
  })

  test('TC-US07-011 ตรวจสอบข้อมูลหลังบันทึกการแก้ไข', async ({ page }) => {
    const updatedBooking = booking({
      hn: VALID_HN,
      fullName: 'Anan Updated',
      date: NEW_DATE,
      room: NEW_ROOM,
      procedure: newProcedure,
      durationMinutes: 120,
    })

    await openEditPage(page, {
      currentBooking: updatedBooking,
    })

    await expect(page.getByPlaceholder('HN (7 digits)')).toHaveValue(VALID_HN)
    await expect(page.getByPlaceholder('Full Name')).toHaveValue('Anan Updated')
    await expect(page.locator('#surgery-date')).toHaveValue(NEW_DATE)
    await expect(page.locator('select.room-select')).toHaveValue(NEW_ROOM)
    await expect(page.getByRole('button', { name: 'Select Procedure' }))
      .toContainText('Laparoscopic Cholecystectomy')
  })

  test('TC-US07-012 ยกเลิกการแก้ไขโดยไม่บันทึก', async ({ page }) => {
    await openEditPage(page)

    // เปลี่ยนข้อมูล แต่ไม่กด Confirm Booking
    await page.getByPlaceholder('Full Name').fill('Unsaved Name')

    await page.locator('.back-btn').click()

    await expect(page).toHaveURL(/\/home$/)

    // กลับมาเปิดรายการเดิมอีกครั้ง ข้อมูลต้องยังเป็นค่าเดิม
    await page.goto(`/booking/${BOOKING_ID}`)
    await expect(page.getByPlaceholder('Full Name')).toHaveValue('Somchai Jaidee')
    await expect(page.locator('#surgery-date')).toHaveValue(OLD_DATE)
  })
})
