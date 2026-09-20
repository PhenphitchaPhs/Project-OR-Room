# Admin CSV export acceptance tests

## Live admin007 exports

Use `playwright.live.config.ts` for **admin007 on https://project-or-room.vercel.app**. The two features have separate test files: `admin-export-csv-live.spec.ts` (TC-A09.1–TC-A09.6) and `admin-export-pdf-live.spec.ts` (TC-A10.1–TC-A10.6). Shared authentication, data loading and file-check helpers live in `helpers/admin-export-live.ts`, which declares no test cases. This configuration is independent of staging environment variables and does not start Vite or seed the database. It logs in with the real Admin account, then reads the current booking list as its expected data instead of expecting ten fixture records. Passwords are read from `LIVE_ADMIN_PASSWORD` or the ignored `.env.live.local`; `LIVE_ADMIN_USERNAME` defaults to `admin007`.

Run from `frontend-v` in PowerShell:

```powershell
$env:LIVE_ADMIN_USERNAME='admin007'
$env:LIVE_ADMIN_PASSWORD=[System.Net.NetworkCredential]::new('', (Read-Host 'Password for admin007' -AsSecureString)).Password
npx.cmd playwright test --config=playwright.live.config.ts
npx.cmd playwright show-report playwright-report/live --port 9324
```

The live suite runs six CSV and six PDF checks with a visible Chrome browser. Run each feature independently with:

```powershell
# CSV only
npx.cmd playwright test --config=playwright.live.config.ts e2e/admin-export-csv-live.spec.ts
# PDF only
npx.cmd playwright test --config=playwright.live.config.ts e2e/admin-export-pdf-live.spec.ts
```

Authentication state stays in memory. Reports and downloaded files are saved locally under ignored `playwright-report/live` and `test-results/live`. Each run replaces the live report; run both files together using the command above to retain both features in one report.

Live checks do not change bookings. TC-A10.5 simulates an export API HTTP 503 and a font-loading HTTP 503 in the test page only, checks error messages, no download, and loading-state recovery, removes each route in finally, then retries against real services. They cover the data currently available; `coverage-gap` and `manual-check-required` annotations identify unavailable boundary data, file-display review still requiring manual checks. Passing this suite does not certify scenarios marked as coverage gaps or manual checks. Concurrent changes between page load and download are reported as mismatches rather than silently accepted. Nothing has been executed on Production merely by creating this suite.


## PDF Thai font regression

Run `node --test tests/pdf-font.test.mjs` from `frontend-v` to generate and parse synthetic multi-page PDFs locally. These checks exercise Thai SARA AM, SARA AA, tone marks, duplicate/overlapping names and both report grouping modes without contacting the live backend.

The Thai mapping fix is in `src/components/report/QueueReportPdf.ts`, so it must be deployed before live PDF tests can exercise it. The E2E reader accepts equivalent composed/decomposed Thai text, but no longer removes duplicated vowels or replaces incorrect Latin characters. Existing downloaded PDFs retain their original mapping errors.

## Default command

`npm.cmd run test:e2e` uses the live configuration and runs both Admin export features against the deployed website. Set `LIVE_ADMIN_PASSWORD` locally first. The staging Playwright suites have been removed.
