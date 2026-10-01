import { test, expect } from '@playwright/test'

const procedure = 'Fistulotomy (ผ่าตัดเปิดฝีคัณฑสูตร) - 30 mins'
const today = '2026-10-01'
const booking = { id: 1, hn: '1234567', fullName: 'Early Finish', age: 45, gender: 'male', procedure,
  durationMinutes: 20, date: today, room: 'OR-201', doctorLicense: '12345', status: 'Upcoming', queueOrder: 1 }

async function setup(page, role, fail = false) {
  await page.clock.setFixedTime( new Date('2026-10-01T10:00:00+07:00'))
  await page.addInitScript(role => {
    localStorage.setItem('isLoggedIn', 'true'); localStorage.setItem('userRole', role)
    localStorage.setItem('userLicense', '12345'); localStorage.setItem('orNumber', '201')
    localStorage.setItem('authToken', 'test-token')
  }, role)
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    if (path.startsWith('/api/patients/')) return route.fulfill({ status: 404, json: { error: 'Not found' } })
    if (path.endsWith('/status')) return route.fulfill({ status: fail ? 500 : 200, json: { success: !fail } })
    if (path === '/api/bookings/1') return route.fulfill({ json: route.request().method() === 'GET' ? booking : { success: true } })
    if (path === '/api/bookings') return route.fulfill({ json: [booking, { ...booking, id: 2, fullName: 'Next Patient', queueOrder: 2 }] })
    if (path === '/api/users') return route.fulfill({ json: [{ license: '12345', doctorName: 'Test Doctor', role: 'user', orNumber: 201 }] })
    if (path === '/api/users/12345') return route.fulfill({ json: { orNumber: 201 } })
    return route.fulfill({ json: [] })
  })
}

for (const role of ['user', 'admin']) {
  test(`${role}: completing a case removes it and leaves the next queue active`, async ({ page }) => {
    await setup(page, role)
    await page.goto(role === 'admin' ? '/admin-home' : '/home')
    const card = page.locator('.case-card').filter({ hasText: 'Early Finish' })
    const request = page.waitForRequest(r => r.url().endsWith('/1/status') && r.method() === 'PATCH')
    await card.getByRole('button', { name: 'Completed', exact: true }).click()
    expect((await request).postDataJSON()).toEqual({ status: 'Completed' })
    await expect(card).toHaveCount(0)
    await expect(page.locator('.case-card').filter({ hasText: 'Next Patient' })).toBeVisible()
  })
  test(`${role}: failed completion keeps the case and allows retry`, async ({ page }) => {
    await setup(page, role, true)
    await page.goto(role === 'admin' ? '/admin-home' : '/home')
    const card = page.locator('.case-card').filter({ hasText: 'Early Finish' })
    await card.getByRole('button', { name: 'Completed', exact: true }).click()
    await expect(page.getByText('Unable to complete this case. Please try again.')).toBeVisible()
    await expect(card.getByRole('button', { name: 'Completed', exact: true })).toBeEnabled()
  })
  test(`${role}: surgery selection defaults to standard duration and allows an override`, async ({ page }) => {
    await setup(page, role)
    await page.goto(role === 'admin' ? '/admin-add-patient' : '/booking')
    await page.getByRole('button', { name: 'Select Procedure' }).click()
    await page.getByRole('option').filter({ hasText: 'Fistulotomy' }).click()
    const duration = page.getByRole('spinbutton', { name: 'Surgery duration (minutes)' })
    await expect(duration).toHaveValue('30')
    await duration.fill('15')
    await expect(duration).toHaveValue('15')
    await expect(page.getByRole('button', { name: 'Select Procedure' })).not.toContainText('mins')
    await expect(page.getByText('Standard duration: 30 minutes.')).toBeVisible()
  })
}

test('editing preserves the case duration and sends the override on save', async ({ page }) => {
  await setup(page, 'user')
  await page.goto('/booking/1')
  const duration = page.getByRole('spinbutton', { name: 'Surgery duration (minutes)' })
  await expect(duration).toHaveValue('20')
  await duration.fill('15')
  const request = page.waitForRequest(r => r.url().endsWith('/api/bookings/1') && r.method() === 'PUT')
  await page.locator('button[type="submit"]').click()
  const payload = (await request).postDataJSON()
  expect(payload.durationMinutes).toBe(15)
  expect(payload.procedure).toBe(procedure)
})

for (const role of ['user', 'admin']) {
  test(`${role}: booking a 120-minute procedure for 60 minutes shows 60 on the queue`, async ({ page }) => {
    await setup(page, role)
    const saved = []
    await page.route(/\/api\/bookings(?:\?.*)?$/, async route => {
      if (route.request().method() === 'POST') {
        const payload = route.request().postDataJSON()
        expect(payload.durationMinutes).toBe(60)
        saved.push({ ...payload, id: 10, status: 'Upcoming' })
        return route.fulfill({ status: 201, json: { success: true } })
      }
      return route.fulfill({ json: saved })
    })
    await page.goto(role === 'admin' ? '/admin-add-patient' : '/booking')
    await page.getByPlaceholder('HN (7 digits)').fill('2345678')
    await page.getByPlaceholder('Full Name', { exact: true }).fill('Sixty Minute Case')
    await page.getByPlaceholder('Age (years)').fill('40')
    await page.locator('select').filter({ has: page.locator('option[value="male"]') }).selectOption('male')
    if (role === 'admin') await page.locator('select').filter({ has: page.locator('option[value="12345"]') }).selectOption('12345')
    await page.getByRole('button', { name: 'Select Procedure' }).click()
    await page.getByRole('option').filter({ hasText: 'Laparoscopic Cholecystectomy' }).click()
    const duration = page.getByRole('spinbutton', { name: 'Surgery duration (minutes)' })
    await expect(duration).toHaveValue('120')
    await expect(page.getByRole('button', { name: 'Select Procedure' })).not.toContainText('120')
    await expect(page.getByText('Standard duration: 120 minutes.')).toBeVisible()
    await duration.fill('60')
    await page.locator('select').filter({ has: page.locator('option[value="OR-201"]') }).selectOption('OR-201')
    await page.locator('#surgery-date').fill(today)
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(role === 'admin' ? /admin-home$/ : /home$/)
    const card = page.locator('.case-card').filter({ hasText: 'Sixty Minute Case' })
    await expect(card).toContainText('Surgery duration: 60 minutes')
    await expect(card).not.toContainText('120 mins')
    await page.reload()
    await expect(card).toContainText('Surgery duration: 60 minutes')
    if (role === 'user') {
      await expect(page.locator('.capacity-header')).toContainText('1/7 hrs.')
      await expect(page.locator('.capacity-fill')).toHaveAttribute('style', /width: 14\.285/)
    }
  })
}
