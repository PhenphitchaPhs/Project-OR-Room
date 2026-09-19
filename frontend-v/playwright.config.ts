import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

if (process.env.PLAYWRIGHT_STAGING === '1') {
  const stagingEnv = loadEnv('staging', process.cwd(), '')
  for (const [key, value] of Object.entries(stagingEnv)) {
    if (!process.env[key]) process.env[key] = value
  }
}

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL

export default defineConfig({
  testDir: './e2e',

  timeout: 30 * 1000,
  expect: {

    timeout: 5000,
  },

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: process.env.CI ? 1 : undefined,

  reporter: 'html',

  use: {

    actionTimeout: 0,

    baseURL: externalBaseURL || (process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173'),

    trace: 'on-first-retry',

    headless: !!process.env.CI,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(browserChannel ? { channel: browserChannel } : {}),
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },

  ],

  webServer: externalBaseURL ? undefined : {

    command: process.env.CI ? 'npm run preview' : 'npm run dev',
    port: process.env.CI ? 4173 : 5173,
    reuseExistingServer: !process.env.CI,
  },
})
