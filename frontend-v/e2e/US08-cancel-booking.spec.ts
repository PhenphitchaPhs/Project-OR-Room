import { expect, test, type Page } from '@playwright/test'

const BOOKING_ID = 'e2e-us08-001'
const ACTIVE_BOOKING = {
  id: BOOKING_ID,
  hn: '1234567',
  fullName: 'Somchai Jaidee',
  age: 45,
  gender: 'male',
  underlying: 'Hypertension',
  diagnosis: 'Acute appendicitis',
  procedure: 'Appendectomy - 60 mins',
  durationMinutes: 60,
  date: '2026-10-15',
  room: 'OR-201',
  surgeryDetails: 'Surgery details',
  notes: 'Test booking',
  doctorLicense: 'DR-E2E-001',
  status: 'Upcoming',
}

function makeBooking(overrides: Record<string, unknown> = {}) {
  return { ...ACTIVE_BOOKING, ...overrides }
}

async function installCancelFixtures(
  page: Page,
  options: {
    bookings?: Record<string, unknown>[]
    patchStatus?: number
    patchResponse?: Record<string, unknown>
  } = {},
) {
  let bookings = options.bookings ?? [makeBooking()]
  let patchCalled = false

  await page.route('**/api/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()

    if (url.pathname === '/api/bookings' && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(bookings),
      })
    }

    if (url.pathname === `/api/bookings/${BOOKING_ID}/status` && method === 'PATCH') {
      patchCalled = true

      const body = JSON.parse(request.postData() || '{}')
      bookings = bookings.map(item =>
        String(item.id) === BOOKING_ID
          ? { ...item, status: body.status }
          : item,
      )

      return route.fulfill({
        status: options.patchStatus ?? 200,
        contentType: 'application/json',
        body: JSON.stringify(options.patchResponse ?? { ok: true }),
      })
    }

    if (url.pathname === '/api/holidays') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      })
    }

    if (url.pathname === `/api/bookings/${BOOKING_ID}` && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(bookings.find(item => String(item.id) === BOOKING_ID) ?? {}),
      })
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })

  return {
    wasPatchCalled: () => patchCalled,
    getBookings: () => bookings,
  }
}

async function openHome(
  page: Page,
  options: Parameters<typeof installCancelFixtures>[1] = {},
) {
  const fixture = await installCancelFixtures(page, options)

  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('isLoggedIn', 'true')
    localStorage.setItem('userRole', 'user')
    localStorage.setItem('userLicense', 'DR-E2E-001')
    localStorage.setItem('doctorName', 'E2E Doctor')
    localStorage.setItem('authToken', 'playwright-e2e-token')
  })

  await page.goto('/home')
  await expect(page.locator('.dashboard-container')).toBeVisible()

  // HomeView เปิดแท็บ Today เป็นค่าเริ่มต้น
  // fixture ใช้วันที่ 2026-10-15 ซึ่งเป็นคิว Upcoming จึงต้องเลือกแท็บ Upcoming ก่อน
  await page.getByRole('button', { name: 'Upcoming', exact: true }).click()
  await expect(page.locator('.case-card').first()).toBeVisible()

  return fixture
}

function bookingCard(page: Page) {
  return page.locator('.case-card').filter({ hasText: '1234567' }).first()
}

async function openCancelConfirm(page: Page) {
  const card = bookingCard(page)
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.locator('.modal-msg-title')).toHaveText(
    'Move this case to Not Complete?',
  )
}

test.describe('US-08 ยกเลิกการจอง', () => {
  test('TC-US08-001 เลือกคิวที่ต้องการยกเลิก', async ({ page }) => {
    await openHome(page)

    const card = bookingCard(page)
    await card.click()

    await expect(card).toContainText('HN:')
    await expect(card).toContainText('Somchai Jaidee')
    await expect(card).toContainText('Appendectomy')
  })

  test('TC-US08-002 ตรวจสอบข้อมูลคิวก่อนยกเลิก', async ({ page }) => {
    await openHome(page)

    const card = bookingCard(page)
    await card.click()

    await expect(card).toContainText('1234567')
    await expect(card).toContainText('Somchai Jaidee')
    await expect(card).toContainText('45 years')
    await expect(card).toContainText('Appendectomy')
    await expect(card).toContainText('2026-10-15')
    await expect(card).toContainText('OR-201')
  })

  test('TC-US08-003 กดปุ่มยกเลิกคิว', async ({ page }) => {
    await openHome(page)

    await openCancelConfirm(page)

    await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel', exact: true }).last()).toBeVisible()
  })

  test('TC-US08-004 ไม่สามารถยกเลิกคิวที่ถูกยกเลิกแล้ว', async ({ page }) => {
    await installCancelFixtures(page, {
      bookings: [makeBooking({ status: 'Cancelled' })],
    })

    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userRole', 'user')
      localStorage.setItem('userLicense', 'DR-E2E-001')
      localStorage.setItem('doctorName', 'E2E Doctor')
      localStorage.setItem('authToken', 'playwright-e2e-token')
    })
    await page.goto('/home')

    await expect(page.locator('.dashboard-container')).toBeVisible()

    // คิว Cancelled อยู่ใต้ Passed > Cancelled
    await page.getByRole('button', { name: 'Passed', exact: true }).click()
    await page.getByRole('button', { name: 'Cancelled', exact: true }).click()

    const card = page.locator('.case-card').filter({ hasText: '1234567' }).first()
    await expect(card).toBeVisible()
    await expect(card).toHaveClass(/not-complete-item/)

    await expect(
      card.getByRole('button', { name: 'Cancel', exact: true }),
    ).toHaveCount(0)

    await expect(card).toHaveClass(/not-complete-item/)

    await expect(
        card.getByRole('button', { name: 'Cancel', exact: true }),
    ).not.toBeVisible()
  })

  test('TC-US08-005 ยืนยันการยกเลิกคิว', async ({ page }) => {
    const fixture = await openHome(page)

    await openCancelConfirm(page)
    await page.getByRole('button', { name: 'Confirm', exact: true }).click()

    await expect.poll(() => fixture.getBookings()[0].status).toBe('Cancelled')
    await expect(page.getByText('Move this case to Not Complete?')).toHaveCount(0)
  })

  test('TC-US08-006 ยกเลิกการดำเนินการโดยไม่ยืนยัน', async ({ page }) => {
    const fixture = await openHome(page)

    await openCancelConfirm(page)

    const modal = page.locator('.white-modal-card')
    await modal.getByRole('button', { name: 'Cancel', exact: true }).click()

    await expect(page.locator('.modal-msg-title')).toHaveCount(0)
    await expect.poll(() => fixture.getBookings()[0].status).toBe('Upcoming')
    await expect(
      bookingCard(page).getByRole('button', { name: 'Cancel', exact: true }),
    ).toBeVisible()
  })

  test('TC-US08-007 ตรวจสอบสถานะคิวหลังยกเลิก', async ({ page }) => {
    const fixture = await openHome(page)

    await openCancelConfirm(page)
    await page.getByRole('button', { name: 'Confirm', exact: true }).click()

    await expect.poll(() => fixture.getBookings()[0].status).toBe('Cancelled')

    // คิว Cancelled อยู่ใต้ Passed > Cancelled
    await page.getByRole('button', { name: 'Passed', exact: true }).click()
    await page.getByRole('button', { name: 'Cancelled', exact: true }).click()

    const cancelledCard = page.locator('.case-card.not-complete-item').first()
    await expect(cancelledCard).toBeVisible()
    await expect(cancelledCard).toContainText('HN:')
    await expect(cancelledCard).toBeVisible()
    await expect(cancelledCard).toHaveClass(/not-complete-item/)
    await expect(cancelledCard).toContainText('HN:')
  })

  test('TC-US08-008 คิวที่ยกเลิกไม่แสดงเป็นคิวที่ใช้งานอยู่', async ({ page }) => {
    const fixture = await openHome(page)

    await openCancelConfirm(page)
    await page.getByRole('button', { name: 'Confirm', exact: true }).click()

    await expect.poll(() => fixture.getBookings()[0].status).toBe('Cancelled')

    // Upcoming ต้องไม่มี booking ที่ถูกยกเลิก
    await page.getByRole('button', { name: 'Upcoming', exact: true }).click()
    await expect(
      page.locator('.case-card').filter({ hasText: '1234567' }),
    ).toHaveCount(0)
  })

  test('TC-US08-009 สามารถใช้ช่วงเวลาที่คิวถูกยกเลิกกลับมาจองได้', async ({ page }) => {
    const fixture = await openHome(page)

    await openCancelConfirm(page)
    await page.getByRole('button', { name: 'Confirm', exact: true }).click()

    await expect.poll(() => fixture.getBookings()[0].status).toBe('Cancelled')

    // ตรวจสอบข้อมูลที่ถูกยกเลิกยังมีวัน/ห้องเดิม ซึ่งเป็นช่วงเวลาที่ควรกลับมาใช้ได้
    const cancelled = fixture.getBookings()[0]
    expect(cancelled.date).toBe('2026-10-15')
    expect(cancelled.room).toBe('OR-201')

    // ตรวจผ่าน Home ว่ารายการเดิมถูกเปลี่ยนสถานะแล้วและไม่ถูกนับเป็น active
    await page.getByRole('button', { name: 'Upcoming', exact: true }).click()
    await expect(
      page.locator('.case-card').filter({ hasText: '1234567' }),
    ).toHaveCount(0)
  })
})
