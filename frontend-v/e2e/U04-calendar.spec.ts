import { expect, test, type Page } from '@playwright/test'

/**
 * U-04 ปฏิทินการจอง
 * Test cases: TC-U04-001 ถึง TC-U04-010
 *
 * ชุดนี้ใช้ API fixture ผ่าน page.route() เพื่อให้ผลทดสอบไม่ขึ้นกับข้อมูล
 * ในฐานข้อมูลจริง และสามารถรันซ้ำได้โดยใช้ข้อมูลชุดเดิม
 */

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const pad2 = (value: number) => String(value).padStart(2, '0')

const dateString = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

const currentDate = new Date()
currentDate.setHours(12, 0, 0, 0)

const currentYear = currentDate.getFullYear()
const currentMonth = currentDate.getMonth()

/** คืนวันที่ทำการถัดไปภายในเดือนปัจจุบัน */
const nextWeekdayInCurrentMonth = () => {
  const date = new Date(currentDate)
  date.setDate(date.getDate() + 1)

  while (date.getMonth() === currentMonth && (date.getDay() === 0 || date.getDay() === 6)) {
    date.setDate(date.getDate() + 1)
  }

  // ถ้าเดือนนี้เหลือแต่ weekend ให้ใช้วันทำการแรกของเดือน
  if (date.getMonth() !== currentMonth) {
    date.setDate(1)
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1)
    }
  }

  return dateString(date)
}

const bookingDate = nextWeekdayInCurrentMonth()

/** หา element ของวันที่ เช่น 15 โดยไม่ไปจับเลข 15 ในข้อความอื่น */
const dayCell = (page: Page, isoDate: string) => {
  const day = Number(isoDate.slice(-2))

  return page
    .locator('.day-cell:not(.empty-cell)')
    .filter({ has: page.getByText(String(day), { exact: true }) })
    .first()
}

type Booking = {
  id: string
  date: string
  room: string
  fullName: string
  hn: string
  age: number
  gender: 'male' | 'female'
  procedure: string
  diagnosis: string
  durationMinutes: number
  status: string
  doctorLicense: string
}

const baseBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'e2e-booking-001',
  date: bookingDate,
  room: 'OR-201',
  fullName: 'Somchai Jaidee',
  hn: '0123456',
  age: 45,
  gender: 'male',
  procedure: 'Appendectomy',
  diagnosis: 'Acute appendicitis',
  durationMinutes: 60,
  status: 'Scheduled',
  doctorLicense: 'DR-E2E-001',
  ...overrides,
})

type FixtureOptions = {
  schedule?: Booking[]
  holiday?: { date: string; name: string }
}

/**
 * Mock API ที่ CalendarView ใช้จริง:
 * /api/schedule
 * /api/bookings
 * /api/holidays
 */
async function installFixtures(page: Page, options: FixtureOptions = {}) {
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (!url.pathname.startsWith('/api/')) return route.continue()

    if (url.pathname === '/api/schedule') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(options.schedule ?? []),
      })
    }

    if (url.pathname === '/api/bookings' && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(options.schedule ?? []),
      })
    }

    if (url.pathname === '/api/holidays') {
      const items = options.holiday
        ? [
            {
              start: { date: options.holiday.date },
              summary: options.holiday.name,
            },
          ]
        : []

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items }),
      })
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })
}

/**
 * เข้า Calendar โดย seed localStorage ตาม auth guard ของโปรเจกต์
 */
async function openCalendar(page: Page, options: FixtureOptions = {}) {
  await installFixtures(page, options)

  await page.goto('/login')

  await page.evaluate(() => {
    localStorage.setItem('isLoggedIn', 'true')
    localStorage.setItem('userRole', 'user')
    localStorage.setItem('userLicense', 'DR-E2E-001')
    localStorage.setItem('authToken', 'playwright-e2e-token')
  })

  await page.goto('/calendar')

  await expect(page).toHaveURL(/\/calendar$/)
  await expect(page.locator('.calendar-page')).toBeVisible()
  await expect(page.locator('.month-label')).toContainText(String(currentYear + 543))
}

async function clickDate(page: Page, isoDate: string) {
  const cell = dayCell(page, isoDate)
  await expect(cell).toBeVisible()
  await cell.click()
  await expect(page.locator('.overlay-modal')).toBeVisible()
}

test.describe('U-04 ปฏิทินการจอง', () => {
  for (const role of ['user', 'admin']) {
    test(`Completed bookings remain visible in the previous month (${role})`, async ({ page }) => {
      const pastDate = dateString(new Date(currentYear, currentMonth - 1, 15, 12))
      await installFixtures(page, {
        schedule: [
          baseBooking({ date: pastDate, status: 'Completed' }),
          baseBooking({ id: 'cancelled-past', date: pastDate, status: 'Cancelled', room: 'OR-202' }),
        ],
      })
      await page.goto('/login')
      await page.evaluate((userRole) => {
        localStorage.setItem('isLoggedIn', 'true')
        localStorage.setItem('userRole', userRole)
        localStorage.setItem('userLicense', 'DR-E2E-001')
        localStorage.setItem('authToken', 'playwright-e2e-token')
      }, role)
      await page.goto(role === 'admin' ? '/admin-calendar' : '/calendar')
      await page.locator('.ctrl-btn').first().click()
      const cell = dayCell(page, pastDate)
      await expect(cell.locator('.dot')).toHaveCount(1)
      await cell.click()
      await expect(page.locator('.booking-item')).toHaveCount(1)
      await expect(page.locator('.booking-item')).toContainText('Somchai Jaidee')
      await expect(page.locator('.booking-item')).toContainText('OR-201')
    })
  }

  test('TC-U04-001 แสดงปฏิทินการจอง', async ({ page }) => {
    await openCalendar(page)

    // ชื่อเดือน + ปี พ.ศ.
    await expect(page.locator('.month-label')).toHaveText(
      `${monthNames[currentMonth]} ${currentYear + 543}`,
    )

    // วันทั้ง 7 วัน
    await expect(page.locator('.weekday-cell')).toHaveText([
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
    ])

    // มีช่องวันที่ของเดือนปัจจุบัน
    await expect(page.locator('.day-cell:not(.empty-cell)')).toHaveCount(
      new Date(currentYear, currentMonth + 1, 0).getDate(),
    )
  })

  test('TC-U04-002 แสดงรายการจองในแต่ละวันบนปฏิทิน', async ({ page }) => {
    const bookings = [
      baseBooking({
        id: 'booking-001',
        room: 'OR-201',
      }),
      baseBooking({
        id: 'booking-002',
        room: 'OR-202',
        procedure: 'Laparoscopic Cholecystectomy',
        durationMinutes: 120,
      }),
    ]

    await openCalendar(page, { schedule: bookings })

    const cell = dayCell(page, bookingDate)

    // วันที่มี booking ต้องมี class has-booking
    await expect(cell).toHaveClass(/has-booking/)

    // มีจุด booking 2 จุด
    await expect(cell.locator('.dot')).toHaveCount(2)

    // เปิดรายละเอียดและตรวจว่ามี 2 booking
    await cell.click()
    await expect(page.locator('.booking-item')).toHaveCount(2)
  })

  test('TC-U04-003 แสดงรายละเอียดคิวเมื่อเลือกวันที่', async ({ page }) => {
    const booking = baseBooking()

    await openCalendar(page, { schedule: [booking] })
    await clickDate(page, bookingDate)

    const modal = page.locator('.card-modal')

    await expect(modal).toContainText('OR-201')
    await expect(modal).toContainText('Somchai Jaidee')
    await expect(modal).toContainText('0123456')
    await expect(modal).toContainText('45 years')
    await expect(modal).toContainText('Male')
    await expect(modal).toContainText('Appendectomy')
    await expect(modal).toContainText('Acute appendicitis')
  })

  test('TC-U04-004 ตรวจสอบจำนวนเคสที่จองในแต่ละวัน', async ({ page }) => {
    const bookings = [
      baseBooking({ id: 'booking-001', room: 'OR-201' }),
      baseBooking({ id: 'booking-002', room: 'OR-202' }),
      baseBooking({ id: 'booking-003', room: 'OR-203' }),
      // Completed bookings remain visible in the calendar.
      baseBooking({ id: 'booking-completed', room: 'OR-204', status: 'Completed' }),
      // Cancelled ต้องไม่ถูกนับ
      baseBooking({ id: 'booking-cancelled', room: 'OR-205', status: 'Cancelled' }),
    ]

    await openCalendar(page, { schedule: bookings })

    const cell = dayCell(page, bookingDate)

    // Show at most three dots and a count for additional bookings.
    await expect(cell.locator('.dot')).toHaveCount(3)
    await expect(cell.locator('.more-count')).toHaveText('+1')

    await cell.click()

    // Show active and completed bookings, but exclude cancelled bookings.
    await expect(page.locator('.booking-item')).toHaveCount(4)
    await expect(page.locator('.booking-item').filter({ hasText: 'OR-204' })).toBeVisible()
    await expect(page.locator('.booking-item').filter({ hasText: 'OR-205' })).toHaveCount(0)

  })

  test('TC-U04-005 เลือกวันที่เพื่อดูข้อมูลการจอง', async ({ page }) => {
    await openCalendar(page)

    await clickDate(page, bookingDate)

    // วันที่ใน modal ต้องตรงกับวันที่ผู้ใช้คลิก
    const date = new Date(`${bookingDate}T00:00:00`)
    const expectedTitle =
      `📅 ${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear() + 543}`

    await expect(page.locator('.modal-title')).toHaveText(expectedTitle)
  })

  test('TC-U04-006 แสดงวันหยุดราชการบนปฏิทิน', async ({ page }) => {
    // เลือกวันทำการในเดือนปัจจุบันที่ไม่ใช่วัน booking
    const holidayDate = (() => {
      const date = new Date(currentYear, currentMonth, 1, 12)
      while (date.getDay() === 0 || date.getDay() === 6 || dateString(date) === bookingDate) {
        date.setDate(date.getDate() + 1)
      }
      return dateString(date)
    })()

    const holidayName = 'E2E Test Holiday'

    await openCalendar(page, {
      holiday: {
        date: holidayDate,
        name: holidayName,
      },
    })

    const cell = dayCell(page, holidayDate)

    await expect(cell).toHaveClass(/holiday-cell/)
    await expect(cell.locator('.holiday-tag')).toHaveText(holidayName)

    await cell.click()

    await expect(page.locator('.capacity-closed-text')).toContainText(
      'Operating rooms closed',
    )

    // วันหยุดต้องไม่มีปุ่ม Add Queue
    await expect(page.getByRole('button', { name: /Add Queue/i })).toHaveCount(0)
  })

  test('TC-U04-007 ตรวจสอบสถานะห้องผ่าตัดว่างและไม่ว่าง', async ({ page }) => {
    const bookings = [
      // 420 นาที = ห้องเต็ม
      baseBooking({
        id: 'booking-full',
        room: 'OR-201',
        durationMinutes: 420,
      }),
      // 120 นาที = ห้องใช้งานบางส่วน
      baseBooking({
        id: 'booking-partial',
        room: 'OR-202',
        durationMinutes: 120,
      }),
    ]

    await openCalendar(page, { schedule: bookings })
    await clickDate(page, bookingDate)

    const modal = page.locator('.card-modal')

    // 20 ห้องทั้งหมด / OR-201 เต็ม -> 19 ห้องยังว่าง
    await expect(modal.locator('.capacity-line')).toContainText('19/20 rooms available')

    // ตรวจสถานะห้อง
    await expect(modal.locator('.room-chip.room-full')).toContainText('OR-201')
    await expect(modal.locator('.room-chip.room-partial')).toContainText('OR-202')
    await expect(modal.locator('.room-chip.room-available')).toHaveCount(18)

    await expect(
      modal.locator('.room-chip.room-full').filter({ hasText: 'OR-201' }),
    ).toContainText('Full')

    await expect(
      modal.locator('.room-chip.room-partial').filter({ hasText: 'OR-202' }),
    ).toContainText('5h')
  })

  test('TC-U04-008 เปลี่ยนเดือนในปฏิทินการจอง', async ({ page }) => {
    await openCalendar(page)

    const initialMonth = currentMonth
    const initialYear = currentYear

    // เดือนก่อนหน้า
    await page.locator('.ctrl-btn').first().click()

    const previous = new Date(initialYear, initialMonth - 1, 1)
    await expect(page.locator('.month-label')).toHaveText(
      `${monthNames[previous.getMonth()]} ${previous.getFullYear() + 543}`,
    )

    // เดือนถัดไป
    await page.locator('.ctrl-btn').last().click()

    await expect(page.locator('.month-label')).toHaveText(
      `${monthNames[initialMonth]} ${initialYear + 543}`,
    )

    // ตรวจว่าระบบเรียก schedule ของเดือนที่กลับมา
    await expect(page.locator('.calendar-grid')).toBeVisible()
  })

  test('TC-U04-009 กลับไปยังวันที่ปัจจุบันด้วยปุ่ม Today', async ({ page }) => {
    await openCalendar(page)

    // ไปเดือนก่อนหน้า
    await page.locator('.ctrl-btn').first().click()

    const todayButton = page.getByRole('button', { name: 'Today', exact: true })
    await todayButton.click()

    await expect(page.locator('.month-label')).toHaveText(
      `${monthNames[currentMonth]} ${currentYear + 543}`,
    )

    // วันนี้ต้องมี class today-cell และ today-circle
    const todayCell = page.locator('.day-cell.today-cell')
    await expect(todayCell).toHaveCount(1)
    await expect(todayCell.locator('.today-circle')).toHaveCount(1)
    await expect(todayCell.locator('.today-circle')).toHaveText(String(currentDate.getDate()))
  })

  test('TC-U04-010 แสดงผลเมื่อเลือกวันที่ไม่มีรายการจอง', async ({ page }) => {
    await openCalendar(page, { schedule: [] })

    await clickDate(page, bookingDate)

    const modal = page.locator('.card-modal')

    // ต้องแจ้งว่าไม่มี booking
    await expect(modal.locator('.empty-state')).toHaveText('No bookings for today')

    // ไม่มีรายการ booking
    await expect(modal.locator('.booking-item')).toHaveCount(0)

    // ไม่มี booking แต่ยังมีห้องว่างครบ 20 ห้อง
    await expect(modal.locator('.capacity-line')).toContainText('20/20 rooms available')

    // มีห้องว่างทั้งหมด 20 ห้อง
    await expect(modal.locator('.room-chip.room-available')).toHaveCount(20)
  })
})
