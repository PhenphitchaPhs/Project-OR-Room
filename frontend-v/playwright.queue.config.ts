import { defineConfig } from '@playwright/test'
export default defineConfig({
  timeout: 15000, reporter: 'list', testDir: './e2e', testMatch: 'queue-completion-duration.spec.ts',
  use: { baseURL: 'http://127.0.0.1:4175', channel: 'chrome', timezoneId: 'Asia/Bangkok' },
  webServer: { command: 'npm.cmd run dev -- --host 127.0.0.1 --port 4175', url: 'http://127.0.0.1:4175', reuseExistingServer: false },
})
