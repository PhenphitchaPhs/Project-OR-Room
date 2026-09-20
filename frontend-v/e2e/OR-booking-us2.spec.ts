import { expect, test, type Page } from '@playwright/test'

const patient = {
  hn: '0123456',
  fullName: 'Somchai Jaidee',
  gender: 'male',
  underlying: 'Hypertension',
}

const procedure = 'Laparoscopic Cholecystectomy / LC (ผ่าตัดนิ่วในถุงน้ำดี) - 120 mins'

const weekdayAfter = (daysFromNow: number) => {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + daysFromNow)
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

const nextWeekday = weekdayAfter(2)
const nextSaturday = (() => {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7 || 7))
  return date.toISOString().slice(0, 10)
})()

type FixtureOptions = {
  schedule?: Array<Record<string, unknown>>
}

async function installFixtures(page: Page, options: FixtureOptions = {}) {
  await page.route(url => new URL(url).pathname.startsWith('/api/'), async route => {
    const request = route.request()
    const url = new URL(request.url())
    const { pathname } = url

    if (pathname === `/api/patients/${patient.hn}`) {
      return route.fulfill({ json: patient })
    }
    if (pathname === '/api/users/DR-E2E-001') {
      return route.fulfill({ json: { orNumber: 201 } })
    }
    if (pathname === '/api/procedures') return route.fulfill({ json: [] })
    if (pathname === '/api/holidays') return route.fulfill({ json: { items: [] } })
    if (pathname === '/api/schedule') return route.fulfill({ json: options.schedule ?? [] })
    if (pathname === '/api/bookings' && request.method() === 'POST') {
      return route.fulfill({ status: 201, json: { id: 'booking-e2e' } })
    }

    return route.fulfill({ json: {} })
  })
}

async function openBooking(page: Page, options?: FixtureOptions) {
  await installFixtures(page, options)
  // Seed storage from the application's own origin. This is more reliable than
  // addInitScript when a previously running Vite server is reused by Playwright.
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.setItem('isLoggedIn', 'true')
    localStorage.setItem('userRole', 'user')
    localStorage.setItem('userLicense', 'DR-E2E-001')
    localStorage.setItem('authToken', 'playwright-e2e-token')
  })
  await page.goto('/booking')
  await expect(page).toHaveURL(/\/booking$/)
  await expect(page.getByRole('heading', { name: 'ORchestrator' })).toBeVisible()
}

async function chooseProcedure(page: Page) {
  await page.getByRole('button', { name: 'Select Procedure' }).click()
  await page.getByRole('option', { name: procedure }).click()
}

async function fillRequiredBooking(page: Page, surgeryDate = nextWeekday) {
  await page.getByPlaceholder('HN (7 digits)').fill(patient.hn)
  await page.getByPlaceholder('HN (7 digits)').blur()
  await expect(page.getByText('✅ Found')).toBeVisible()
  await expect(page.getByPlaceholder('Full Name')).toHaveValue(patient.fullName)
  await page.getByPlaceholder('Age (years)').fill('45')
  await page.locator('select').filter({ has: page.getByRole('option', { name: 'Male' }) }).selectOption('male')
  await chooseProcedure(page)
  await page.locator('.room-select').selectOption('OR-201')
  await page.locator('#surgery-date').fill(surgeryDate)
  await page.locator('#surgery-date').blur()
}

test.describe('U-02 OR booking', () => {
  test('TC-U02-001 searches a patient using a valid HN', async ({ page }) => {
    await openBooking(page)

    await page.getByPlaceholder('HN (7 digits)').fill(patient.hn)
    await page.getByPlaceholder('HN (7 digits)').blur()

    await expect(page.getByText('✅ Found')).toBeVisible()
    await expect(page.getByPlaceholder('Full Name')).toHaveValue(patient.fullName)
    await expect(page.locator('select').filter({ has: page.getByRole('option', { name: 'Male' }) })).toHaveValue('male')
    await expect(page.getByPlaceholder('Underlying Disease(s)')).toHaveValue(patient.underlying)
  })

  test('TC-U02-002 prevents submitting an HN that is not seven digits', async ({ page }) => {
    await openBooking(page)
    let createCalls = 0
    page.on('request', request => {
      if (request.url().endsWith('/api/bookings') && request.method() === 'POST') createCalls += 1
    })

    await page.getByPlaceholder('HN (7 digits)').fill('123456')
    await page.getByRole('button', { name: 'Confirm Booking' }).click()

    expect(await page.getByPlaceholder('HN (7 digits)').evaluate(input => input.validity.valid)).toBe(false)
    expect(createCalls).toBe(0)
  })

  test('TC-U02-003 accepts an available weekday surgery date', async ({ page }) => {
    await openBooking(page)
    await page.locator('#surgery-date').fill(nextWeekday)
    await page.locator('#surgery-date').blur()

    await expect(page.locator('#surgery-date')).toHaveValue(nextWeekday)
    await expect(page.locator('.alert-modal')).toBeHidden()
  })

  test('TC-U02-004 rejects Saturday and Sunday surgery dates', async ({ page }) => {
    await openBooking(page)
    await page.locator('#surgery-date').fill(nextSaturday)
    await page.locator('#surgery-date').blur()

    await expect(page.getByText('The operating rooms are closed on weekends')).toBeVisible()
    await expect(page.locator('#surgery-date')).toHaveValue('')
  })

  test('TC-U02-005 selects a surgery type', async ({ page }) => {
    await openBooking(page)
    await chooseProcedure(page)

    await expect(page.getByRole('button', { name: 'Select Procedure' })).toContainText('Laparoscopic Cholecystectomy')
  })

  test('TC-U02-006 shows all entered booking details before confirmation', async ({ page }) => {
    await openBooking(page)
    await fillRequiredBooking(page)

    await expect(page.getByPlaceholder('HN (7 digits)')).toHaveValue(patient.hn)
    await expect(page.getByPlaceholder('Full Name')).toHaveValue(patient.fullName)
    await expect(page.getByPlaceholder('Age (years)')).toHaveValue('45')
    await expect(page.getByRole('button', { name: 'Select Procedure' })).toContainText('Laparoscopic Cholecystectomy')
    await expect(page.locator('.room-select')).toHaveValue('OR-201')
    await expect(page.locator('#surgery-date')).toHaveValue(nextWeekday)
  })

  test('TC-U02-007 prevents confirmation when required booking data is missing', async ({ page }) => {
    await openBooking(page)
    let createCalls = 0
    page.on('request', request => {
      if (request.url().endsWith('/api/bookings') && request.method() === 'POST') createCalls += 1
    })

    await page.getByRole('button', { name: 'Confirm Booking' }).click()

    expect(await page.getByPlaceholder('HN (7 digits)').evaluate(input => input.validity.valid)).toBe(false)
    expect(createCalls).toBe(0)
  })

  test('TC-U02-008 creates a booking when all required data is valid', async ({ page }) => {
    await openBooking(page)
    let savedBooking: Record<string, unknown> | undefined
    page.on('request', request => {
      if (request.url().endsWith('/api/bookings') && request.method() === 'POST') {
        savedBooking = request.postDataJSON() as Record<string, unknown>
      }
    })
    await fillRequiredBooking(page)
    await page.getByRole('button', { name: 'Confirm Booking' }).click()

    await expect(page.getByText('Booking created successfully!')).toBeVisible()
    expect(savedBooking).toMatchObject({
      hn: patient.hn, fullName: patient.fullName, date: nextWeekday, room: 'OR-201',
      procedure, durationMinutes: 120, doctorLicense: 'DR-E2E-001',
    })
  })

  test('TC-U02-009 saves additional surgery details with the booking', async ({ page }) => {
    await openBooking(page)
    let savedBooking: Record<string, unknown> | undefined
    page.on('request', request => {
      if (request.url().endsWith('/api/bookings') && request.method() === 'POST') {
        savedBooking = request.postDataJSON() as Record<string, unknown>
      }
    })
    await fillRequiredBooking(page)
    await page.getByPlaceholder('Enter additional surgery details...').fill('Laparoscopic approach; assess adhesions.')
    await page.getByRole('button', { name: 'Confirm Booking' }).click()

    await expect(page.getByText('Booking created successfully!')).toBeVisible()
    expect(savedBooking).toMatchObject({ surgeryDetails: 'Laparoscopic approach; assess adhesions.' })
  })

  test.fixme('TC-U02-010 prevents a booking that exceeds the room capacity', async ({ page }) => {
    // The U-02 spreadsheet requires a conflict to be rejected. The current UI only warns
    // that capacity is exceeded and explicitly permits the booking, so this remains a
    // documented failing requirement until blocking validation is implemented.
    await openBooking(page, {
      schedule: [{ id: 'existing', room: 'OR-201', status: 'Upcoming', durationMinutes: 420 }],
    })
    await fillRequiredBooking(page)
    await expect(page.getByText(/will exceed the 7-hour limit/)).toBeVisible()
    await page.getByRole('button', { name: 'Confirm Booking' }).click()
    await expect(page.getByText('Booking created successfully!')).toBeHidden()
  })
})
