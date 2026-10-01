import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sign } from 'hono/jwt'
import worker from '../src/index.js'
import { PROCEDURE_DURATIONS } from '../src/procedureDurations.js'
const procedure = Object.keys(PROCEDURE_DURATIONS).find(value => value.endsWith('120 mins'))!
async function send(role: string, method: string, duration: unknown, owner = 'doctor') {
  const writes: unknown[][] = []
  const DB = { prepare() {
    let values: unknown[] = []
    const stmt = { bind(...args: unknown[]) { values = args; return stmt },
      async first() { return { id: 1, doctorLicense: owner } },
      async run() { writes.push(values); return { success: true } } }
    return stmt
  } }
  const JWT_SECRET = 'test-secret'
  const token = await sign({ license: 'doctor', role, exp: Math.floor(Date.now()/1000)+60 }, JWT_SECRET)
  const path = method === 'POST' ? '/api/bookings' : method === 'PUT' ? '/api/bookings/1' : '/api/bookings/1/status'
  const body = method === 'PATCH' ? { status: 'Completed' } : { hn: '1234567', procedure, durationMinutes: duration }
  const response = await worker.fetch(new Request('http://localhost'+path, { method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    { DB, JWT_SECRET } as any, {} as any)
  return { response, writes }
}
for (const role of ['user', 'admin']) {
  for (const method of ['POST', 'PUT']) test(`${role} ${method} honors the override`, async () => {
    const { response, writes } = await send(role, method, 60)
    assert.equal(response.status, method === 'POST' ? 201 : 200)
    assert.equal(writes[0]?.[5], 60)
  })
  test(`${role} can complete a case`, async () => {
    const { response, writes } = await send(role, 'PATCH', undefined)
    assert.equal(response.status, 200); assert.deepEqual(writes[0], ['Completed', '1'])
  })
}
for (const duration of [0, -1, 1.5, 1441, '15']) test(`rejects invalid duration ${duration}`, async () => {
  const { response, writes } = await send('user', 'POST', duration)
  assert.equal(response.status, 400); assert.equal(writes.length, 0)
})
test('omitted duration uses the standard', async () => {
  const { response, writes } = await send('user', 'POST', undefined)
  assert.equal(response.status, 201); assert.equal(writes[0]?.[5], PROCEDURE_DURATIONS[procedure])
})
test('user cannot complete another doctor case', async () => {
  const { response, writes } = await send('user', 'PATCH', undefined, 'other')
  assert.equal(response.status, 403); assert.equal(writes.length, 0)
})
