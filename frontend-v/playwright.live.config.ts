import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

// Independent of staging variables, proxy, fixtures and local dev server.
const env = loadEnv('live', process.cwd(), '')
for (const key of ['LIVE_ADMIN_USERNAME', 'LIVE_ADMIN_PASSWORD']) {
  if (!process.env[key] && env[key]) process.env[key] = env[key]
}
process.env.LIVE_ADMIN_USERNAME ||= 'admin007'

export default defineConfig({
  testDir: './e2e',
  testMatch: [
  '**/admin-export-csv-live.spec.ts',
  '**/admin-export-pdf-live.spec.ts',
  '**/U04-calendar.spec.ts',
  '**/US07-edit-booking.spec.ts',
  '**/US08-cancel-booking.spec.ts',
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
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
})
