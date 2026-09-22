import { expect, test } from '@playwright/test'

for (const role of ['user', 'admin']) {
  for (const hour of ['01', '19']) {
    test(`${role}: today's new booking stays visible at ${hour}:00 Bangkok`, async ({ page }) => {
      await page.clock.setFixedTime(new Date(`2026-09-22T${hour}:00:00+07:00`))
      await page.addInitScript((role) => {
        localStorage.setItem('isLoggedIn', 'true')
        localStorage.setItem('userRole', role)
        localStorage.setItem('userLicense', 'DR-TEST')
        localStorage.setItem('authToken', 'local-test')
      }, role)
      const patient = { hn: '1234567', fullName: 'Today Test Patient', gender: 'male' }
      const bookings: Record<string, unknown>[] = []
      const statusWrites: string[] = []
      await page.route(url => url.pathname.startsWith('/api/'), async route => {
        const request = route.request()
        const path = new URL(request.url()).pathname
        if (path === '/api/bookings' && request.method() === 'POST') {
          bookings.push({ ...request.postDataJSON(), id: 1, status: 'Upcoming' })
          return route.fulfill({ status: 201, json: { success: true } })
        }
        if (path === '/api/bookings') return route.fulfill({ json: bookings })
        if (path.endsWith('/status')) {
          statusWrites.push(request.postData() || '')
          return route.fulfill({ json: { success: true } })
        }
        if (path.startsWith('/api/patients/')) return route.fulfill({ json: patient })
        if (path === '/api/users') return route.fulfill({ json: [{ license: 'DR-TEST', doctorName: 'Test Doctor', role: 'user' }] })
        if (path.startsWith('/api/users/')) return route.fulfill({ json: { orNumber: 201 } })
        if (path === '/api/holidays') return route.fulfill({ json: { items: [] } })
        return route.fulfill({ json: [] })
      })

      await page.goto(role === 'admin' ? '/admin-add-patient' : '/booking')
      await page.getByPlaceholder('HN (7 digits)').fill(patient.hn)
      await page.getByPlaceholder('HN (7 digits)').blur()
      await expect(page.getByPlaceholder('Full Name')).toHaveValue(patient.fullName)
      await page.getByPlaceholder('Age (years)').fill('45')
      if (role === 'admin') {
        await page.locator('select').filter({ has: page.getByRole('option', { name: 'Select Doctor', exact: true }) }).selectOption('DR-TEST')
      }
      await page.getByRole('button', { name: 'Select Procedure', exact: true }).click()
      await page.getByRole('option', { name: /Laparoscopic Cholecystectomy/ }).click()
      await page.locator('.room-select').selectOption('OR-201')
      const date = page.locator('input[type="date"]').first()
      await expect(date).toHaveAttribute('min', '2026-09-22')
      await date.fill('2026-09-22')
      await date.blur()
      await page.getByRole('button', { name: 'Confirm Booking' }).click()
      await expect(page).toHaveURL(role === 'admin' ? /\/admin-home$/ : /\/home$/)
      await expect(page.locator('.queue-filter button.active')).toHaveText('Today')
      await expect(page.locator('.case-card').filter({ hasText: patient.fullName })).toBeVisible()
      expect(bookings).toHaveLength(1)
      expect(statusWrites).toEqual([])
      await page.reload()
      await expect(page.locator('.case-card').filter({ hasText: patient.fullName })).toBeVisible()
      expect(statusWrites).toEqual([])
    })
  }
}
