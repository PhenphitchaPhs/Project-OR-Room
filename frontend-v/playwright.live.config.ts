import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

// Independent of staging variables, proxy, fixtures and local dev server.
const env = loadEnv('live', process.cwd(), '')
for (const key of [
  'LIVE_ADMIN_USERNAME',
  'LIVE_ADMIN_PASSWORD',
  'LIVE_USER_EMAIL',
  'LIVE_USER_PASSWORD',
  'LIVE_USER_B_EMAIL',
  'LIVE_USER_B_PASSWORD',
  'LIVE_EMPTY_USER_EMAIL',
  'LIVE_EMPTY_USER_PASSWORD',
]) {
  if (!process.env[key] && env[key]) process.env[key] = env[key]
}
process.env.LIVE_ADMIN_USERNAME ||= 'admin007'
process.env.LIVE_USER_EMAIL ||= 'qa.test01@example.com'
process.env.LIVE_USER_B_EMAIL ||= 'qa.test02@example.com'

export default defineConfig({
  testDir: './e2e',
  testMatch: [
    '**/admin-export-csv-live.spec.ts',
    '**/admin-export-pdf-live.spec.ts',
    '**/U04-calendar.spec.ts',
    '**/US07-edit-booking.spec.ts',
    '**/US08-cancel-booking.spec.ts',
    '**/user-export-csv-live.spec.ts',
    '**/user-export-pdf-live.spec.ts',
  ],
  timeout: 180_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  outputDir: 'test-results/live',
  reporter: [['line'], ['html', { outputFolder: 'playwright-report/live', open: 'never' }]],
  use: {
    baseURL: 'https://project-or-room.vercel.app',
    headless: false,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
})
