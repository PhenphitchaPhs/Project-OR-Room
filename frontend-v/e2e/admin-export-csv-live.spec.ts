import { test, expect, coverageGap, open, exportAndCheck, status } from './helpers/admin-export-live.js'

const format = 'CSV' as const
const prefix = 'TC-A09'

test.describe(`Admin ${format} export — live admin007`, () => {
  test(`${prefix}.1 ค่าเริ่มต้นและล้างตัวกรอง`, async ({ page, snapshot }) => {
    const dialog = await open(page, format)
    await expect(dialog.getByRole('button', { name: 'All dates', exact: true })).toHaveClass(/active/)
    await expect(dialog.locator('.export-label-hint')).toHaveText(['All', 'All', 'All'])
    await dialog.getByRole('button', { name: 'Monthly', exact: true }).click()
    await dialog.locator('input[type="month"]').fill('2026-01')
    await dialog.getByRole('button', { name: 'Clear all filters' }).click()
    await expect(dialog.getByRole('button', { name: 'CSV (Spreadsheet)' })).toHaveClass(/active/)
    await expect(dialog.getByRole('button', { name: 'All dates', exact: true })).toHaveClass(/active/)
    await expect(dialog.locator('input[type="month"]')).toHaveCount(0)
    if (snapshot.rows.length) await expect(dialog.getByText(`${snapshot.rows.length} booking(s) will be exported`)).toBeVisible()
  })

  test(`${prefix}.2 ส่งออกทั้งหมดเทียบข้อมูลจริง`, async ({ page, snapshot }) => {
    await exportAndCheck(page, await open(page, format), format, snapshot.rows, snapshot)
  })

  test(`${prefix}.3 วันที่และช่วงวันที่ไม่ถูกต้อง`, async ({ page, snapshot }) => {
    test.skip(!snapshot.rows.length, 'No live bookings for date checks.')
    const date = snapshot.rows.map((row) => row.date.slice(0, 10)).sort()[0]!
    for (const mode of ['Daily', 'Monthly', 'Date range']) {
      await test.step(mode, async () => {
        const dialog = await open(page, format)
        await dialog.getByRole('button', { name: mode, exact: true }).click()
        if (mode === 'Monthly') await dialog.locator('input[type="month"]').fill(date.slice(0, 7))
        else if (mode === 'Date range') {
          const lastDate = snapshot.rows.map((row) => row.date.slice(0, 10)).sort().at(-1)!
          await dialog.locator('input[type="date"]').nth(0).fill(date)
          await dialog.locator('input[type="date"]').nth(1).fill(lastDate)
        } else await dialog.locator('input[type="date"]').fill(date)
        const expected = snapshot.rows.filter((row) => mode === 'Date range' || (mode === 'Monthly' ? row.date.startsWith(date.slice(0, 7)) : row.date.slice(0, 10) === date))
        await exportAndCheck(page, dialog, format, expected, snapshot)
      })
    }
    const dialog = await open(page, format)
    await dialog.getByRole('button', { name: 'Date range', exact: true }).click()
    const dates = dialog.locator('input[type="date"]')
    for (const [from, to] of [[date, ''], ['', date], ['2099-02-28', '2099-02-01']]) {
      await dates.nth(0).fill(from!); await dates.nth(1).fill(to!)
      await expect(dialog.getByRole('button', { name: `Download ${format}` })).toBeDisabled()
      await expect(dialog.getByText(from && to ? 'Start date must be before the end date' : 'Select a start and end date')).toBeVisible()
    }
    coverageGap('Month-edge fixtures are not created on live; available dates only are checked.')
  })

  test(`${prefix}.4 กรองข้อมูลจริง CSV`, async ({ page, snapshot }) => {
    test.skip(!snapshot.rows.length, 'No live bookings for filter checks.')
    const rooms = [...new Set(snapshot.rows.map((row) => row.room).filter(Boolean))]
    for (const selected of [rooms.slice(0, 1), rooms.slice(0, 2)]) {
      const dialog = await open(page, format)
      for (const room of selected) await dialog.getByRole('button', { name: room, exact: true }).click()
      await exportAndCheck(page, dialog, format, snapshot.rows.filter((row) => selected.includes(row.room)), snapshot)
    }
    for (const value of ['Upcoming', 'Completed', 'Cancelled']) {
      const expected = snapshot.rows.filter((row) => status(row.status) === value)
      if (!expected.length) { coverageGap(`No live ${value} bookings to export.`); continue }
      const dialog = await open(page, format)
      await dialog.getByRole('button', { name: value, exact: true }).click()
      await exportAndCheck(page, dialog, format, expected, snapshot)
    }
    const doctor = snapshot.doctors.find((d) => d.role === 'user' && snapshot.rows.some((r) => r.doctorLicense === d.license))
    if (doctor) {
      const dialog = await open(page, format)
      await dialog.getByRole('button', { name: 'Select doctors...' }).click()
      await dialog.getByLabel(doctor.doctorName, { exact: true }).check()
      await dialog.locator('.export-dropdown-toggle').click()
      await exportAndCheck(page, dialog, format, snapshot.rows.filter((row) => row.doctorLicense === doctor.license), snapshot)
    } else coverageGap('No selectable doctor with live bookings.')
    const selectedDoctors = snapshot.doctors.filter((d) => d.role === 'user' && snapshot.rows.some((r) => r.doctorLicense === d.license)).slice(0, 2)
    if (selectedDoctors.length === 2) {
      const dialog = await open(page, format)
      await dialog.getByRole('button', { name: 'Select doctors...' }).click()
      for (const d of selectedDoctors) await dialog.getByLabel(d.doctorName, { exact: true }).check()
      await dialog.locator('.export-dropdown-toggle').click()
      await exportAndCheck(page, dialog, format, snapshot.rows.filter((r) => selectedDoctors.some((d) => d.license === r.doctorLicense)), snapshot)
    } else coverageGap('Two selectable doctors with bookings are required for multi-doctor filtering.')
    const statuses = [...new Set(snapshot.rows.map((r) => status(r.status)))].filter((s) => ['Upcoming', 'Completed', 'Cancelled'].includes(s))
    if (statuses.length > 1) {
      const dialog = await open(page, format)
      for (const value of statuses.slice(0, 2)) await dialog.getByRole('button', { name: value, exact: true }).click()
      await exportAndCheck(page, dialog, format, snapshot.rows.filter((r) => statuses.slice(0, 2).includes(status(r.status))), snapshot)
    } else coverageGap('Multiple status values are absent from live data.')
    if (doctor) {
      const row = snapshot.rows.find((r) => r.doctorLicense === doctor.license && r.room && statuses.includes(status(r.status)))
      if (row) {
        const dialog = await open(page, format)
        await dialog.getByRole('button', { name: 'Daily', exact: true }).click()
        await dialog.locator('input[type="date"]').fill(row.date.slice(0, 10))
        await dialog.getByRole('button', { name: row.room, exact: true }).click()
        await dialog.getByRole('button', { name: status(row.status), exact: true }).click()
        await dialog.getByRole('button', { name: 'Select doctors...' }).click()
        await dialog.getByLabel(doctor.doctorName, { exact: true }).check()
        await dialog.locator('.export-dropdown-toggle').click()
        const expected = snapshot.rows.filter((r) => r.date.slice(0, 10) === row.date.slice(0, 10) && r.room === row.room && r.doctorLicense === doctor.license && status(r.status) === status(row.status))
        await exportAndCheck(page, dialog, format, expected, snapshot)
      }
    }
  })

  test(`${prefix}.5 ไม่พบข้อมูลและกลับมาดาวน์โหลด`, async ({ page, snapshot }) => {
    let day = new Date('2099-01-01T00:00:00Z')
    while (snapshot.rows.some((row) => row.date.startsWith(day.toISOString().slice(0, 10)))) day = new Date(day.getTime() + 86400000)
    const dialog = await open(page, format)
    await dialog.getByRole('button', { name: 'Daily', exact: true }).click()
    await dialog.locator('input[type="date"]').fill(day.toISOString().slice(0, 10))
    await expect(dialog.getByText('No bookings found for the selected filters')).toBeVisible()
    await expect(dialog.getByRole('button', { name: `Download ${format}` })).toBeDisabled()
    if (snapshot.rows.length) {
      await dialog.getByRole('button', { name: 'Clear all filters' }).click()
      await exportAndCheck(page, dialog, format, snapshot.rows, snapshot)
    } else coverageGap('Recovery download unavailable: live system has no bookings.')
  })

  test(`${prefix}.6 ตรวจไฟล์ที่ดาวน์โหลดจากเว็บจริง`, async ({ page, snapshot }) => {
    await exportAndCheck(page, await open(page, format), format, snapshot.rows, snapshot)
    test.info().annotations.push({ type: 'manual-check-required', description: 'Open in Excel to confirm display and leading-zero HNs.' })
    if (!snapshot.rows.some((row) => /^0/.test(row.hn))) coverageGap('Live data has no leading-zero HN.')
  })
})
