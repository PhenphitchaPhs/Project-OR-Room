import {
  expect,
  request as apiRequest,
  test as base,
  type APIRequestContext,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test'

type LoginUser = {
  license: string
  doctorName: string
  email?: string
  orNumber?: string | number
  role: 'admin' | 'user'
}

type Account = {
  token: string
  user: LoginUser
  state: Awaited<ReturnType<BrowserContext['storageState']>>
}

type Procedure = {
  id: number
  name: string
  durationMinutes: number
  createdBy: string
  createdByName?: string
  value: string
  isActive?: boolean
}

type AuditLog = {
  id: number
  procedureId: number
  procedureName: string
  action: 'created' | 'updated' | 'deleted'
  actorLicense: string
  actorName?: string
  createdAt: string
  oldName?: string
  newName?: string
  oldDurationMinutes?: number
  newDurationMinutes?: number
  actorRole?: string
}

type Accounts = {
  request: APIRequestContext
  admin: Account
  userA: Account
  userB: Account
}

const BASE_URL = 'https://project-or-room.vercel.app'
const STALE_NAME = /^E2E (Owner|Delete|Permission|Admin|Audit)/

function storageState(token: string, user: LoginUser): Account['state'] {
  return {
    cookies: [],
    origins: [{
      origin: BASE_URL,
      localStorage: [
        { name: 'authToken', value: token },
        { name: 'isLoggedIn', value: 'true' },
        { name: 'userLicense', value: user.license },
        { name: 'doctorName', value: user.doctorName || '' },
        { name: 'userRole', value: user.role },
        { name: 'orNumber', value: String(user.orNumber || '') },
      ],
    }],
  }
}

async function login(
  request: APIRequestContext,
  identifier: string,
  password: string,
  role: LoginUser['role'],
): Promise<Account> {
  const response = await request.post('/api/login', {
    data: role === 'admin'
      ? { license: identifier, password }
      : { email: identifier, password },
  })
  expect(response.status(), `Login must succeed for ${identifier}`).toBe(200)
  const body = await response.json() as { token: string; user: LoginUser }
  expect(body.token).toBeTruthy()
  expect(body.user.role).toBe(role)
  return { token: body.token, user: body.user, state: storageState(body.token, body.user) }
}

const test = base.extend<Record<string, never>, { accounts: Accounts }>({
  accounts: [async ({}, use) => {
    const adminUsername = process.env.LIVE_ADMIN_USERNAME || 'admin007'
    const adminPassword = process.env.LIVE_ADMIN_PASSWORD
    const userAEmail = process.env.LIVE_USER_EMAIL
    const userAPassword = process.env.LIVE_USER_PASSWORD
    const userBEmail = process.env.LIVE_USER_B_EMAIL
    const userBPassword = process.env.LIVE_USER_B_PASSWORD || userAPassword

    if (!adminPassword) throw new Error('Set LIVE_ADMIN_PASSWORD locally before running permission tests.')
    if (!userAEmail || !userAPassword) {
      throw new Error('Set LIVE_USER_EMAIL and LIVE_USER_PASSWORD locally before running permission tests.')
    }
    if (!userBEmail || !userBPassword) {
      throw new Error('Set LIVE_USER_B_EMAIL and LIVE_USER_B_PASSWORD locally before running permission tests.')
    }

    const request = await apiRequest.newContext({ baseURL: BASE_URL })
    try {
      const [admin, userA, userB] = await Promise.all([
        login(request, adminUsername, adminPassword, 'admin'),
        login(request, userAEmail, userAPassword, 'user'),
        login(request, userBEmail, userBPassword, 'user'),
      ])
      expect(userA.user.license).not.toBe(userB.user.license)
      const accounts = { request, admin, userA, userB }
      await cleanupStaleProcedures(accounts)
      await use(accounts)
    } finally {
      await request.dispose()
    }
  }, { scope: 'worker' }],
})

function auth(account: Account) {
  return { Authorization: `Bearer ${account.token}` }
}

function uniqueName(label: string) {
  return `E2E ${label} ${Date.now()} ${Math.random().toString(36).slice(2, 7)}`
}

async function listProcedures(accounts: Accounts, account = accounts.userA) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await accounts.request.get('/api/procedures', { headers: auth(account) })
    if (response.status() === 200) return response.json() as Promise<Procedure[]>
    const body = await response.text()
    if (response.status() < 500 || attempt === 3) {
      expect(response.status(), `GET /api/procedures failed: ${body}`).toBe(200)
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 500))
  }
  throw new Error('GET /api/procedures did not return a response')
}

async function createProcedure(accounts: Accounts, account: Account, name: string, durationMinutes: number) {
  const response = await accounts.request.post('/api/procedures', {
    headers: auth(account),
    data: { name, durationMinutes },
  })
  expect(response.status(), `Create procedure ${name}`).toBe(201)
  return response.json() as Promise<Procedure>
}

async function updateProcedure(
  accounts: Accounts,
  account: Account,
  id: number,
  name: string,
  durationMinutes: number,
) {
  const response = await accounts.request.put(`/api/procedures/${id}`, {
    headers: auth(account),
    data: { name, durationMinutes },
  })
  expect(response.status(), `Update procedure ${id}`).toBe(200)
  return response.json() as Promise<Procedure>
}

async function deleteProcedure(accounts: Accounts, account: Account, id?: number) {
  if (!id) return
  const actors = account.token === accounts.admin.token ? [account] : [account, accounts.admin]
  let lastStatus = 0
  let lastBody = ''
  for (const actor of actors) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await accounts.request.delete(`/api/procedures/${id}`, { headers: auth(actor) })
      lastStatus = response.status()
      if (lastStatus === 200 || lastStatus === 404) return
      lastBody = await response.text()
      if (lastStatus < 500) break
      await new Promise((resolve) => setTimeout(resolve, attempt * 500))
    }
  }
  expect([200, 404], `Cleanup procedure ${id} failed (${lastStatus}): ${lastBody}`).toContain(lastStatus)
}

async function cleanupStaleProcedures(accounts: Accounts) {
  const procedures = await listProcedures(accounts, accounts.admin)
  for (const procedure of procedures.filter((row) => STALE_NAME.test(row.name))) {
    await deleteProcedure(accounts, accounts.admin, procedure.id)
  }
}

async function listAuditLogs(accounts: Accounts, account = accounts.admin) {
  const response = await accounts.request.get('/api/procedures/audit-logs?limit=500', {
    headers: auth(account),
  })
  expect(response.status(), 'Admin audit-log request').toBe(200)
  return response.json() as Promise<AuditLog[]>
}

async function openManager(page: Page, path: '/procedures' | '/admin-procedures') {
  await page.goto(path)
  await page.getByRole('button', { name: 'Manage Surgery Types' }).click()
  const modal = page.locator('.procedure-modal')
  await expect(modal.getByRole('heading', { name: 'Manage Surgery Types' })).toBeVisible()
  return modal
}

function procedureItem(modal: Locator, name: string) {
  return modal.locator('.procedure-item').filter({ hasText: name })
}

function exactProcedureName(modal: Locator, name: string) {
  return modal.locator('.procedure-title-row strong').getByText(name, { exact: true })
}

async function editThroughUi(
  page: Page,
  modal: Locator,
  oldName: string,
  newName: string,
  oldDuration: number,
  newDuration: number,
) {
  const item = procedureItem(modal, oldName)
  await expect(item).toBeVisible()
  await item.getByRole('button', { name: 'Edit' }).click()
  await expect(modal.getByLabel('Surgery type')).toHaveValue(oldName)
  await expect(modal.getByLabel('Estimated duration (minutes)')).toHaveValue(String(oldDuration))
  await modal.getByLabel('Surgery type').fill(newName)
  await modal.getByLabel('Estimated duration (minutes)').fill(String(newDuration))
  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname.startsWith('/api/procedures/')
    && response.request().method() === 'PUT')
  await modal.getByRole('button', { name: 'Save changes' }).click()
  const response = await responsePromise
  expect(response.status()).toBe(200)
  await expect(procedureItem(modal, newName)).toContainText(`${newDuration} minutes`)
  await expect(exactProcedureName(modal, oldName)).toHaveCount(0)
}

async function deleteThroughUi(page: Page, modal: Locator, name: string, cancelFirst = false) {
  const clickDelete = async () => {
    await procedureItem(modal, name).getByRole('button', { name: 'Delete' }).click()
    const dialog = page.getByRole('alertdialog', { name: 'Delete surgery type?' })
    await expect(dialog.locator('.confirm-target')).toHaveText(name)
    return dialog
  }

  if (cancelFirst) {
    const dialog = await clickDelete()
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(procedureItem(modal, name)).toBeVisible()
  }

  const dialog = await clickDelete()
  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname.startsWith('/api/procedures/')
    && response.request().method() === 'DELETE')
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click()
  const response = await responsePromise
  expect(response.status()).toBe(200)
  await expect(procedureItem(modal, name)).toHaveCount(0)
}

function logsFor(logs: AuditLog[], procedureId: number) {
  return logs.filter((log) => Number(log.procedureId) === Number(procedureId))
}

function coverageGap(description: string) {
  test.info().annotations.push({ type: 'coverage-gap', description })
}

test.describe('สิทธิ์และประวัติการจัดการประเภทการผ่าตัด — live backend', () => {
  test('TC-N02.1 ผู้สร้างแก้ไขประเภทการผ่าตัดของตนเองได้', async ({ browser, accounts }) => {
    const oldName = uniqueName('Owner Procedure')
    const newName = `${oldName} Updated`
    let procedure: Procedure | undefined
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.userA.state })
    try {
      procedure = await createProcedure(accounts, accounts.userA, oldName, 60)
      const page = await context.newPage()
      const modal = await openManager(page, '/procedures')
      const item = procedureItem(modal, oldName)
      await expect(item.getByRole('button', { name: 'Edit' })).toBeVisible()
      await editThroughUi(page, modal, oldName, newName, 60, 90)
      await expect(procedureItem(modal, newName)).toContainText('Created by you')
      await modal.getByRole('button', { name: 'Refresh' }).click()
      await expect(procedureItem(modal, newName)).toBeVisible()
      await modal.getByRole('button', { name: 'Close' }).click()

      await page.goto('/booking')
      await page.getByRole('button', { name: 'Select Procedure' }).click()
      await page.getByPlaceholder('Search surgery types...').fill(newName)
      await expect(page.getByRole('option', { name: `${newName} - 90 mins`, exact: true })).toBeVisible()
      await page.getByPlaceholder('Search surgery types...').fill(oldName)
      await expect(page.getByRole('option', { name: `${oldName} - 60 mins`, exact: true })).toHaveCount(0)

      const stored = (await listProcedures(accounts)).filter((row) => row.id === procedure?.id)
      expect(stored).toHaveLength(1)
      expect(stored[0]).toMatchObject({ name: newName, durationMinutes: 90, createdBy: accounts.userA.user.license })
    } finally {
      await context.close()
      await deleteProcedure(accounts, accounts.userA, procedure?.id)
    }
  })

  test('TC-N02.2 ผู้สร้างลบประเภทของตนเองได้เมื่อไม่มีคิว Active', async ({ browser, accounts }) => {
    const name = uniqueName('Delete Procedure')
    let procedure: Procedure | undefined
    const before = await listProcedures(accounts)
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.userA.state })
    try {
      procedure = await createProcedure(accounts, accounts.userA, name, 60)
      const page = await context.newPage()
      const modal = await openManager(page, '/procedures')
      await expect(procedureItem(modal, name).getByRole('button', { name: 'Delete' })).toBeVisible()
      await deleteThroughUi(page, modal, name, true)
      await expect(modal.locator('.procedure-item')).toHaveCount(before.length)
      await modal.getByRole('button', { name: 'Refresh' }).click()
      await expect(procedureItem(modal, name)).toHaveCount(0)
      await modal.getByRole('button', { name: 'Close' }).click()
      await page.goto('/booking')
      await page.getByRole('button', { name: 'Select Procedure' }).click()
      await page.getByPlaceholder('Search surgery types...').fill(name)
      await expect(page.getByText('No matching surgery types.')).toBeVisible()
      expect((await listProcedures(accounts)).some((row) => row.id === procedure?.id)).toBe(false)
    } finally {
      await context.close()
      await deleteProcedure(accounts, accounts.userA, procedure?.id)
    }
  })

  test('TC-N02.3 ผู้ใช้อื่นเห็นประเภทแต่แก้ไขหรือลบไม่ได้', async ({ browser, accounts }) => {
    const name = uniqueName('Permission Visible')
    let procedure: Procedure | undefined
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.userB.state })
    try {
      procedure = await createProcedure(accounts, accounts.userA, name, 70)
      const page = await context.newPage()
      const modal = await openManager(page, '/procedures')
      const item = procedureItem(modal, name)
      await expect(item).toContainText('70 minutes')
      await expect(item).toContainText(`Created by ${accounts.userA.user.doctorName || accounts.userA.user.license}`)
      await expect(item.getByRole('button', { name: 'Edit' })).toHaveCount(0)
      await expect(item.getByRole('button', { name: 'Delete' })).toHaveCount(0)
      await modal.getByRole('button', { name: 'Close' }).click()
      await page.goto('/booking')
      await page.getByRole('button', { name: 'Select Procedure' }).click()
      await page.getByPlaceholder('Search surgery types...').fill(name)
      await expect(page.getByRole('option', { name: `${name} - 70 mins`, exact: true })).toBeVisible()

      expect((await listProcedures(accounts, accounts.userB)).find((row) => row.id === procedure?.id))
        .toMatchObject({ name, durationMinutes: 70, createdBy: accounts.userA.user.license })
    } finally {
      await context.close()
      await deleteProcedure(accounts, accounts.userA, procedure?.id)
    }
  })

  test('TC-N02.4 API ป้องกันผู้ใช้ที่ไม่ใช่เจ้าของจากการแก้ไขและลบ', async ({ accounts }) => {
    const name = uniqueName('Permission API')
    let procedure: Procedure | undefined
    try {
      procedure = await createProcedure(accounts, accounts.userA, name, 70)
      const logsBefore = logsFor(await listAuditLogs(accounts), procedure.id)

      const updateResponse = await accounts.request.put(`/api/procedures/${procedure.id}`, {
        headers: auth(accounts.userB),
        data: { name: `${name} Hacked`, durationMinutes: 999 },
      })
      expect(updateResponse.status()).toBe(403)
      expect((await updateResponse.json() as { error: string }).error).toContain('Only the creator or an administrator')

      const deleteResponse = await accounts.request.delete(`/api/procedures/${procedure.id}`, {
        headers: auth(accounts.userB),
      })
      expect(deleteResponse.status()).toBe(403)
      expect((await deleteResponse.json() as { error: string }).error).toContain('Only the creator or an administrator')

      const stored = (await listProcedures(accounts)).find((row) => row.id === procedure?.id)
      expect(stored).toMatchObject({ name, durationMinutes: 70, createdBy: accounts.userA.user.license })
      const logsAfter = logsFor(await listAuditLogs(accounts), procedure.id)
      expect(logsAfter.filter((log) => ['updated', 'deleted'].includes(log.action)))
        .toEqual(logsBefore.filter((log) => ['updated', 'deleted'].includes(log.action)))
    } finally {
      await deleteProcedure(accounts, accounts.userA, procedure?.id)
    }
  })

  test('TC-N02.5 Admin แก้ไขและลบประเภทของผู้ใช้ทุกคนได้', async ({ browser, accounts }) => {
    const userAName = uniqueName('Admin Edit A')
    const editedName = `${userAName} Updated`
    const userBName = uniqueName('Admin Delete B')
    let procedureA: Procedure | undefined
    let procedureB: Procedure | undefined
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.admin.state })
    try {
      procedureA = await createProcedure(accounts, accounts.userA, userAName, 60)
      procedureB = await createProcedure(accounts, accounts.userB, userBName, 50)
      const page = await context.newPage()
      const modal = await openManager(page, '/admin-procedures')
      for (const name of [userAName, userBName]) {
        await expect(procedureItem(modal, name).getByRole('button', { name: 'Edit' })).toBeVisible()
        await expect(procedureItem(modal, name).getByRole('button', { name: 'Delete' })).toBeVisible()
      }

      await editThroughUi(page, modal, userAName, editedName, 60, 95)
      await deleteThroughUi(page, modal, userBName)
      await modal.getByRole('button', { name: 'Refresh' }).click()
      await expect(procedureItem(modal, editedName)).toBeVisible()
      await expect(procedureItem(modal, userBName)).toHaveCount(0)

      const asUserA = (await listProcedures(accounts, accounts.userA)).find((row) => row.id === procedureA?.id)
      expect(asUserA).toMatchObject({ name: editedName, durationMinutes: 95, createdBy: accounts.userA.user.license })
      expect((await listProcedures(accounts, accounts.userB)).some((row) => row.id === procedureB?.id)).toBe(false)
    } finally {
      await context.close()
      await deleteProcedure(accounts, accounts.admin, procedureA?.id)
      await deleteProcedure(accounts, accounts.admin, procedureB?.id)
    }
  })

  test('TC-N02.6 บันทึก Audit Log เมื่อเพิ่ม แก้ไข และลบประเภท', async ({ browser, accounts }) => {
    const oldName = uniqueName('Audit Procedure')
    const newName = `${oldName} Updated`
    let procedure: Procedure | undefined
    try {
      procedure = await createProcedure(accounts, accounts.userA, oldName, 50)
      await updateProcedure(accounts, accounts.userA, procedure.id, newName, 80)
      await deleteProcedure(accounts, accounts.userA, procedure.id)

      const logs = logsFor(await listAuditLogs(accounts), procedure.id)
      expect(logs.map((log) => log.action)).toEqual(['deleted', 'updated', 'created'])
      for (const action of ['created', 'updated', 'deleted'] as const) {
        expect(logs.filter((log) => log.action === action)).toHaveLength(1)
      }
      expect(logs.every((log) => log.actorLicense === accounts.userA.user.license)).toBe(true)
      expect(logs.every((log) => Boolean(log.createdAt))).toBe(true)
      expect([...logs].map((log) => log.id)).toEqual([...logs].map((log) => log.id).sort((a, b) => b - a))

      const context = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.admin.state })
      try {
        const page = await context.newPage()
        await page.goto('/admin-procedures')
        await expect(page.getByRole('heading', { name: 'Change History' })).toBeVisible()
        await expect(page.locator('.audit-row').filter({ hasText: oldName }).filter({ hasText: 'created by' })).toBeVisible()
        await expect(page.locator('.audit-row').filter({ hasText: newName }).filter({ hasText: 'updated by' })).toBeVisible()
        await expect(page.locator('.audit-row').filter({ hasText: newName }).filter({ hasText: 'deleted by' })).toBeVisible()
      } finally {
        await context.close()
      }
    } finally {
      await deleteProcedure(accounts, accounts.userA, procedure?.id)
    }
  })

  test('TC-N02.7 รายละเอียดใน Audit Log ถูกต้องตามข้อมูลที่ระบบเก็บ', async ({ accounts }) => {
    const oldName = uniqueName('Audit Detail')
    const newName = `${oldName} Updated`
    let procedure: Procedure | undefined
    try {
      procedure = await createProcedure(accounts, accounts.userA, oldName, 55)
      await updateProcedure(accounts, accounts.userA, procedure.id, newName, 85)
      await deleteProcedure(accounts, accounts.userA, procedure.id)

      const logs = logsFor(await listAuditLogs(accounts), procedure.id)
      const created = logs.find((log) => log.action === 'created')
      const updated = logs.find((log) => log.action === 'updated')
      const deleted = logs.find((log) => log.action === 'deleted')
      expect(created).toMatchObject({ procedureName: oldName, actorLicense: accounts.userA.user.license })
      expect(updated).toMatchObject({ procedureName: newName, actorLicense: accounts.userA.user.license })
      expect(deleted).toMatchObject({ procedureName: newName, actorLicense: accounts.userA.user.license })
      expect(logs.every((log) => log.actorName === accounts.userA.user.doctorName || log.actorLicense === accounts.userA.user.license)).toBe(true)
      expect(logs.every((log) => /^\d{4}-\d{2}-\d{2}/.test(log.createdAt))).toBe(true)

      if (!logs.some((log) => log.oldName || log.oldDurationMinutes !== undefined)) {
        coverageGap('Audit schema ยังไม่เก็บค่าเก่าและค่าใหม่ไว้ในรายการ updated โดยตรง')
      }
      if (!logs.some((log) => log.actorRole)) {
        coverageGap('Audit schema ยังไม่เก็บ Role ของผู้ดำเนินการ')
      }
    } finally {
      await deleteProcedure(accounts, accounts.userA, procedure?.id)
    }
  })

  test('TC-N02.8 จำกัด Audit Log ให้ Admin และไม่บันทึกคำขอที่ล้มเหลว', async ({ browser, accounts }) => {
    const name = uniqueName('Permission Audit')
    let procedure: Procedure | undefined
    try {
      procedure = await createProcedure(accounts, accounts.userA, name, 65)
      const before = logsFor(await listAuditLogs(accounts), procedure.id)

      const adminContext = await browser.newContext({ baseURL: BASE_URL, storageState: accounts.admin.state })
      try {
        const page = await adminContext.newPage()
        await page.goto('/admin-procedures')
        await expect(page.getByRole('heading', { name: 'Change History' })).toBeVisible()
        await expect(page.locator('.audit-row').filter({ hasText: name })).toContainText('created by')
      } finally {
        await adminContext.close()
      }

      for (const user of [accounts.userA, accounts.userB]) {
        const response = await accounts.request.get('/api/procedures/audit-logs', { headers: auth(user) })
        expect(response.status()).toBe(403)

        const context = await browser.newContext({ baseURL: BASE_URL, storageState: user.state })
        try {
          const page = await context.newPage()
          await page.goto('/procedures')
          await expect(page.getByRole('heading', { name: 'Change History' })).toHaveCount(0)
          page.once('dialog', (dialog) => dialog.accept())
          await page.goto('/admin-procedures')
          await expect(page).toHaveURL(/\/home$/)
        } finally {
          await context.close()
        }
      }

      const updateResponse = await accounts.request.put(`/api/procedures/${procedure.id}`, {
        headers: auth(accounts.userB),
        data: { name: `${name} Forbidden`, durationMinutes: 100 },
      })
      expect(updateResponse.status()).toBe(403)
      const deleteResponse = await accounts.request.delete(`/api/procedures/${procedure.id}`, {
        headers: auth(accounts.userB),
      })
      expect(deleteResponse.status()).toBe(403)

      const stored = (await listProcedures(accounts)).find((row) => row.id === procedure?.id)
      expect(stored).toMatchObject({ name, durationMinutes: 65, createdBy: accounts.userA.user.license })
      const after = logsFor(await listAuditLogs(accounts), procedure.id)
      expect(after).toEqual(before)
    } finally {
      await deleteProcedure(accounts, accounts.userA, procedure?.id)
    }
  })
})
