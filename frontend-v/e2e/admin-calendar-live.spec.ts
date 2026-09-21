import {
  expect,
  test as base,
  type BrowserContext,
  type Page,
} from '@playwright/test'

type Booking = {
  id: number | string
  date: string
  room?: string
  fullName?: string
  hn?: string
  age?: number | string
  gender?: string
  procedure?: string
  diagnosis?: string
  durationMinutes?: number | string
  status?: string
  doctorLicense?: string
}

type Doctor = {
  license: string
  doctorName: string
}

type Holiday = {
  start?: { date?: string }
  date?: string
  summary?: string
  name?: string
}

type CalendarSnapshot = {
  bookings: Booking[]
  doctors: Doctor[]
  holidays: Holiday[]
}

type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const ROOM_NUMBERS = Array.from({ length: 20 }, (_, index) => 201 + index)
const MAX_ROOM_MINUTES = 420

const pad2 = (value: number) => String(value).padStart(2, '0')
const isoDate = (year: number, month: number, day: number) =>
  `${year}-${pad2(month + 1)}-${pad2(day)}`
const dateParts = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return { year: year!, month: month! - 1, day: day! }
}
const monthKey = (value: string) => value.slice(0, 7)
const today = new Date()
const todayIso = isoDate(today.getFullYear(), today.getMonth(), today.getDate())

const normalizedStatus = (value: unknown) => String(value || 'Upcoming').trim().toLowerCase()
const isCalendarBooking = (booking: Booking) =>
  !['completed', 'cancelled', 'canceled', 'succeed'].includes(normalizedStatus(booking.status))

const roomNumber = (value: unknown) => {
  const match = String(value || '').match(/(\d+)/)
  return match ? Number(match[1]) : null
}

const durationMinutes = (booking: Booking) => {
  const stored = Number(booking.durationMinutes)
  if (Number.isFinite(stored) && stored >= 0) return stored
  return Number(String(booking.procedure || '').match(/(\d+)\s*mins?/i)?.[1] || 0)
}

const genderLabel = (value: unknown) =>
  ['female', 'หญิง'].includes(String(value || '').toLowerCase()) ? 'Female' : 'Male'

const roomState = (bookings: Booking[], room: number) => {
  const used = bookings
    .filter((booking) => roomNumber(booking.room) === room)
    .reduce((total, booking) => total + durationMinutes(booking), 0)
  if (used >= MAX_ROOM_MINUTES) return { className: 'room-full', label: 'Full' }
  const remaining = MAX_ROOM_MINUTES - used
  const hours = Math.floor(remaining / 60)
  const minutes = remaining % 60
  return {
    className: used > 0 ? 'room-partial' : 'room-available',
    label: `${hours}h${minutes ? ` ${minutes}m` : ''}`,
  }
}

const activeForDate = (bookings: Booking[], date: string) =>
  bookings.filter((booking) => booking.date?.slice(0, 10) === date && isCalendarBooking(booking))

const doctorName = (booking: Booking, doctors: Doctor[]) =>
  doctors.find((doctor) => doctor.license === booking.doctorLicense)?.doctorName
  || booking.doctorLicense
  || '-'

const test = base.extend<Record<string, never>, { adminState: StorageState }>({
  adminState: [async ({ browser }, use) => {
    const username = process.env.LIVE_ADMIN_USERNAME || 'admin007'
    const password = process.env.LIVE_ADMIN_PASSWORD
    if (!password) {
      throw new Error('Set LIVE_ADMIN_PASSWORD for admin007 locally before running Admin Calendar tests.')
    }

    const context = await browser.newContext({ baseURL: 'https://project-or-room.vercel.app' })
    try {
      const page = await context.newPage()
      await page.goto('/admin-login')
      await page.getByPlaceholder('Name').fill(username)
      await page.getByPlaceholder('Password').fill(password)
      const [loginResponse] = await Promise.all([
        page.waitForResponse((response) =>
          new URL(response.url()).pathname === '/api/login'
          && response.request().method() === 'POST'),
        page.getByRole('button', { name: 'Log in', exact: true }).click(),
      ])
      expect(loginResponse.status(), 'Live Admin login must succeed').toBe(200)
      await expect(page).toHaveURL(/\/admin-home$/)
      expect(await page.evaluate(() => localStorage.getItem('userRole'))).toBe('admin')
      await use(await context.storageState())
    } finally {
      await context.close()
    }
  }, { scope: 'worker' }],
  storageState: async ({ adminState }, use) => use(adminState),
})

async function openCalendar(page: Page): Promise<CalendarSnapshot> {
  const bookingsLoaded = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/bookings'
    && response.request().method() === 'GET')
  const doctorsLoaded = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/users'
    && response.request().method() === 'GET')
  const holidaysLoaded = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/holidays'
    && response.request().method() === 'GET')

  await page.goto('/admin-calendar')
  const [bookingsResponse, doctorsResponse, holidaysResponse] = await Promise.all([
    bookingsLoaded,
    doctorsLoaded,
    holidaysLoaded,
  ])

  expect(bookingsResponse.status(), 'Admin bookings must load').toBe(200)
  expect(doctorsResponse.status(), 'Doctor list must load').toBe(200)
  expect(holidaysResponse.status(), 'Holiday list must load').toBe(200)
  await expect(page).toHaveURL(/\/admin-calendar$/)
  await expect(page.locator('.calendar-page')).toBeVisible()

  const bookings = await bookingsResponse.json()
  const doctors = await doctorsResponse.json()
  const holidayBody = await holidaysResponse.json()
  expect(Array.isArray(bookings)).toBe(true)
  expect(Array.isArray(doctors)).toBe(true)

  return {
    bookings,
    doctors,
    holidays: Array.isArray(holidayBody?.items) ? holidayBody.items : [],
  }
}

function dayCell(page: Page, date: string) {
  const { day } = dateParts(date)
  return page.locator('.day-cell:not(.empty-cell)').filter({
    has: page.locator('.day-number').filter({ hasText: new RegExp(`^${day}$`) }),
  }).first()
}

async function displayedMonth(page: Page) {
  const text = (await page.locator('.month-label').innerText()).trim()
  const match = text.match(/^([A-Za-z]+)\s+(\d{4})$/)
  expect(match, `Unexpected calendar month label: ${text}`).toBeTruthy()
  return { month: MONTHS.indexOf(match![1]!), year: Number(match![2]) - 543 }
}

async function goToMonth(page: Page, year: number, month: number) {
  const current = await displayedMonth(page)
  const delta = (year * 12 + month) - (current.year * 12 + current.month)
  expect(Math.abs(delta), 'Calendar navigation target is unreasonably far away').toBeLessThan(121)
  const button = page.locator('.ctrl-btn').nth(delta > 0 ? 1 : 0)
  for (let index = 0; index < Math.abs(delta); index += 1) await button.click()
  await expect(page.locator('.month-label')).toHaveText(`${MONTHS[month]} ${year + 543}`)
}

async function openDate(page: Page, date: string) {
  const cell = dayCell(page, date)
  await expect(cell).toBeVisible()
  await cell.click()
  await expect(page.locator('.card-modal')).toBeVisible()
  return page.locator('.card-modal')
}

function holidayDates(holidays: Holiday[]) {
  return new Set(holidays.map((holiday) => holiday.start?.date || holiday.date).filter(Boolean))
}

function findMultiDoctorDate(bookings: Booking[]) {
  const byDate = new Map<string, Booking[]>()
  for (const booking of bookings.filter(isCalendarBooking)) {
    const date = booking.date?.slice(0, 10)
    if (!date) continue
    const rows = byDate.get(date) || []
    rows.push(booking)
    byDate.set(date, rows)
  }
  return [...byDate.entries()].find(([, rows]) =>
    new Set(rows.map((row) => row.doctorLicense).filter(Boolean)).size >= 2)
}

function findEmptyWorkingDate(bookings: Booking[], holidays: Holiday[]) {
  const occupied = new Set(bookings.filter(isCalendarBooking).map((booking) => booking.date?.slice(0, 10)))
  const closed = holidayDates(holidays)
  const months = new Set([
    `${today.getFullYear()}-${pad2(today.getMonth() + 1)}`,
    ...bookings.map((booking) => monthKey(booking.date || '')).filter((value) => /^\d{4}-\d{2}$/.test(value)),
  ])
  for (const key of months) {
    const [year, monthNumber] = key.split('-').map(Number)
    const lastDay = new Date(year!, monthNumber!, 0).getDate()
    for (let day = 1; day <= lastDay; day += 1) {
      const value = isoDate(year!, monthNumber! - 1, day)
      const weekday = new Date(year!, monthNumber! - 1, day).getDay()
      if (weekday !== 0 && weekday !== 6 && !closed.has(value) && !occupied.has(value)) return value
    }
  }
  return undefined
}

async function expectMonthData(page: Page, bookings: Booking[], year: number, month: number) {
  await goToMonth(page, year, month)
  const expectedDates = [...new Set(bookings
    .filter(isCalendarBooking)
    .map((booking) => booking.date?.slice(0, 10))
    .filter((date): date is string => date?.startsWith(`${year}-${pad2(month + 1)}`)))].sort()
  await expect(page.locator('.day-cell.has-booking')).toHaveCount(expectedDates.length)
  for (const date of expectedDates) {
    const expectedCount = activeForDate(bookings, date).length
    const cell = dayCell(page, date)
    await expect(cell).toHaveClass(/has-booking/)
    await expect(cell.locator('.dot')).toHaveCount(Math.min(expectedCount, 3))
    if (expectedCount > 3) await expect(cell.locator('.more-count')).toHaveText(`+${expectedCount - 3}`)
  }
}

test.describe('Admin Calendar — live backend', () => {
  test('TC-A05.1 เปิดหน้า Calendar และแสดงรายการคิวผ่าตัด', async ({ page }) => {
    const { bookings } = await openCalendar(page)

    await expect(page.locator('.month-label')).toHaveText(
      `${MONTHS[today.getMonth()]} ${today.getFullYear() + 543}`,
    )
    await expect(page.locator('.weekday-cell')).toHaveText([
      'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat',
    ])
    await expect(page.locator('.ctrl-btn')).toHaveCount(2)
    await expect(page.getByRole('button', { name: 'Today', exact: true })).toBeEnabled()
    await expect(dayCell(page, todayIso)).toHaveClass(/today-cell/)

    const currentRows = bookings.filter((booking) =>
      isCalendarBooking(booking)
      && booking.date?.startsWith(`${today.getFullYear()}-${pad2(today.getMonth() + 1)}`))
    test.skip(!currentRows.length, 'ไม่มีคิว Active ในเดือนปัจจุบันตาม Preconditions ของ TC-A05.1')

    const date = currentRows[0]!.date.slice(0, 10)
    const rows = activeForDate(bookings, date)
    const cell = dayCell(page, date)
    await expect(cell).toHaveClass(/has-booking/)
    await expect(cell.locator('.dot')).toHaveCount(Math.min(rows.length, 3))

    const fullRooms = ROOM_NUMBERS.filter((room) => roomState(rows, room).className === 'room-full').length
    await expect(cell.locator('.capacity-badge')).toHaveText(`${20 - fullRooms}/20 rooms available`)
  })

  test('TC-A05.2 แสดงคิวของแพทย์ทุกคนตรงกับข้อมูลในระบบ', async ({ page }) => {
    const snapshot = await openCalendar(page)
    const match = findMultiDoctorDate(snapshot.bookings)
    test.skip(!match, 'ไม่มีวันที่มีคิว Active ของแพทย์อย่างน้อย 2 คนตาม Preconditions ของ TC-A05.2')
    const [date, expectedRows] = match!
    const { year, month } = dateParts(date)
    await goToMonth(page, year, month)

    const cell = dayCell(page, date)
    await expect(cell.locator('.dot')).toHaveCount(Math.min(expectedRows.length, 3))
    const modal = await openDate(page, date)
    await expect(modal.locator('.booking-item')).toHaveCount(expectedRows.length)

    const itemTexts = await modal.locator('.booking-item').allInnerTexts()
    const expectedIdentities = new Map<string, { booking: Booking; count: number }>()
    for (const booking of expectedRows) {
      const key = [booking.room, doctorName(booking, snapshot.doctors), booking.hn,
        booking.fullName, booking.procedure].join('|')
      const current = expectedIdentities.get(key)
      expectedIdentities.set(key, { booking, count: (current?.count || 0) + 1 })
    }
    for (const { booking, count } of expectedIdentities.values()) {
      const matches = itemTexts.filter((text) =>
        text.includes(`HN: ${booking.hn}`)
        && text.includes(`Doctor: ${doctorName(booking, snapshot.doctors)}`)
        && text.includes(`Room: ${booking.room}`)
        && text.includes(`Patient: ${booking.fullName}`)
        && text.includes(`Procedure: ${booking.procedure}`))
      expect(matches.length, `จำนวนคิวที่ตรงกับข้อมูลต้นทางของ booking ${booking.id}`).toBe(count)
    }
  })

  test('TC-A05.3 แสดงรายละเอียดคิวของแพทย์แต่ละคนครบถ้วน', async ({ page }) => {
    const snapshot = await openCalendar(page)
    const match = findMultiDoctorDate(snapshot.bookings)
    test.skip(!match, 'ไม่มีวันที่มีคิว Active ของแพทย์อย่างน้อย 2 คนตาม Preconditions ของ TC-A05.3')
    const [date, expectedRows] = match!
    const { year, month, day } = dateParts(date)
    await goToMonth(page, year, month)
    const modal = await openDate(page, date)

    await expect(modal.locator('.modal-title')).toContainText(`${day} ${MONTHS[month]} ${year + 543}`)
    const items = modal.locator('.booking-item')
    await expect(items).toHaveCount(expectedRows.length)
    for (let index = 0; index < expectedRows.length; index += 1) {
      const booking = expectedRows[index]!
      const item = items.nth(index)
      await expect(item).toContainText(`Room: ${booking.room || '-'}`)
      await expect(item).toContainText(`Doctor: ${doctorName(booking, snapshot.doctors)}`)
      await expect(item).toContainText(`Patient: ${booking.fullName || ''}`)
      await expect(item).toContainText(`HN: ${booking.hn || ''}`)
      await expect(item).toContainText(`Age / Gender: ${booking.age || '-'} years`)
      await expect(item).toContainText(genderLabel(booking.gender))
      await expect(item).toContainText(`Diagnosis: ${booking.diagnosis || '-'}`)
      await expect(item).toContainText(`Procedure: ${booking.procedure || ''}`)
    }

    const firstView = await items.allInnerTexts()
    await modal.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(modal).toBeHidden()
    await openDate(page, date)
    expect(await page.locator('.card-modal .booking-item').allInnerTexts()).toEqual(firstView)
  })

  test('TC-A05.4 วันที่ เวลา และสถานะห้องตรงกับข้อมูลคิว', async ({ page }) => {
    const snapshot = await openCalendar(page)
    const closed = holidayDates(snapshot.holidays)
    const candidate = snapshot.bookings
      .filter(isCalendarBooking)
      .map((booking) => booking.date?.slice(0, 10))
      .find((date) => {
        if (!date || closed.has(date)) return false
        const { year, month, day } = dateParts(date)
        const weekday = new Date(year, month, day).getDay()
        return weekday !== 0 && weekday !== 6
      })
    test.skip(!candidate, 'ไม่มีคิว Active ในวันทำการตาม Preconditions ของ TC-A05.4')

    const date = candidate!
    const parts = dateParts(date)
    const rows = activeForDate(snapshot.bookings, date)
    await goToMonth(page, parts.year, parts.month)
    const modal = await openDate(page, date)
    await expect(modal.locator('.modal-title')).toContainText(
      `${parts.day} ${MONTHS[parts.month]} ${parts.year + 543}`,
    )

    const expectedStates = ROOM_NUMBERS.map((room) => ({ room, ...roomState(rows, room) }))
    const available = expectedStates.filter((room) => room.className !== 'room-full').length
    await expect(modal.locator('.capacity-line')).toContainText(`${available}/20 rooms available`)
    await expect(modal.locator('.room-chip')).toHaveCount(20)
    for (const expected of expectedStates) {
      const chip = modal.locator('.room-chip').filter({ hasText: `OR-${expected.room}` })
      await expect(chip).toHaveClass(new RegExp(expected.className))
      await expect(chip.locator('.room-time')).toHaveText(expected.label)
    }

    await modal.getByRole('button', { name: 'Close', exact: true }).click()
    const firstOfMonth = new Date(parts.year, parts.month, 1)
    const saturdayOffset = (6 - firstOfMonth.getDay() + 7) % 7
    const saturday = isoDate(parts.year, parts.month, 1 + saturdayOffset)
    const closedModal = await openDate(page, saturday)
    await expect(closedModal.locator('.capacity-closed-text')).toContainText('Operating rooms closed')
  })

  test('TC-A05.5 เปลี่ยนเดือน ปี และกลับมายัง Today ได้ถูกต้อง', async ({ page }) => {
    const { bookings } = await openCalendar(page)
    const activeMonths = [...new Set(bookings.filter(isCalendarBooking).map((booking) => monthKey(booking.date || '')))]
      .filter((value) => /^\d{4}-\d{2}$/.test(value))
      .sort()
    const adjacent = activeMonths.find((value, index) => {
      const next = activeMonths[index + 1]
      if (!next) return false
      const [year, month] = value.split('-').map(Number)
      const [nextYear, nextMonth] = next.split('-').map(Number)
      return nextYear! * 12 + nextMonth! - (year! * 12 + month!) === 1
    })
    test.skip(!adjacent, 'ไม่มีข้อมูลคิว Active ใน 2 เดือนติดกันตาม Preconditions ของ TC-A05.5')

    const firstIndex = activeMonths.indexOf(adjacent!)
    for (const key of [activeMonths[firstIndex]!, activeMonths[firstIndex + 1]!]) {
      const [year, month] = key.split('-').map(Number)
      await expectMonthData(page, bookings, year!, month! - 1)
    }

    const crossYear = today.getMonth() === 11 ? today.getFullYear() : today.getFullYear() - 1
    await goToMonth(page, crossYear, 11)
    await page.locator('.ctrl-btn').nth(1).click()
    await expect(page.locator('.month-label')).toHaveText(`January ${crossYear + 1 + 543}`)
    await page.locator('.ctrl-btn').nth(0).click()
    await expect(page.locator('.month-label')).toHaveText(`December ${crossYear + 543}`)

    await page.getByRole('button', { name: 'Today', exact: true }).click()
    await expect(page.locator('.month-label')).toHaveText(
      `${MONTHS[today.getMonth()]} ${today.getFullYear() + 543}`,
    )
    await expect(dayCell(page, todayIso)).toHaveClass(/today-cell/)
  })

  test('TC-A05.6 แสดงผลถูกต้องเมื่อวันที่เลือกไม่มีคิวผ่าตัด', async ({ page }) => {
    const snapshot = await openCalendar(page)
    const emptyDate = findEmptyWorkingDate(snapshot.bookings, snapshot.holidays)
    test.skip(!emptyDate, 'ไม่พบวันทำการที่ไม่มีคิวตาม Preconditions ของ TC-A05.6')

    const emptyParts = dateParts(emptyDate!)
    await goToMonth(page, emptyParts.year, emptyParts.month)
    const emptyCell = dayCell(page, emptyDate!)
    await expect(emptyCell).not.toHaveClass(/has-booking/)
    await expect(emptyCell.locator('.dot')).toHaveCount(0)
    await expect(emptyCell.locator('.capacity-badge')).toHaveText('20/20 rooms available')

    const modal = await openDate(page, emptyDate!)
    await expect(modal.locator('.empty-state')).toHaveText('No bookings for today')
    await expect(modal.locator('.booking-item')).toHaveCount(0)
    await expect(modal.locator('.capacity-line')).toContainText('20/20 rooms available')
    await expect(modal.locator('.room-chip.room-available')).toHaveCount(20)

    await modal.getByRole('button', { name: 'Close', exact: true }).click()
    const populated = snapshot.bookings.find(isCalendarBooking)
    test.skip(!populated, 'ไม่มีคิว Active สำหรับตรวจการกลับไปยังเดือนที่มีข้อมูล')
    const date = populated!.date.slice(0, 10)
    const parts = dateParts(date)
    await goToMonth(page, parts.year, parts.month)
    await expect(dayCell(page, date)).toHaveClass(/has-booking/)
  })
})
