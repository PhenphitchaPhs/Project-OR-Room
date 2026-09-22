# End-to-end acceptance tests

## Live surgery type search and selection

`surgery-procedure-search-select-live.spec.ts` covers only TC-N04.1 through
TC-N04.4. It verifies the searchable surgery-type dropdown on the booking page,
built-in and Additional groups, partial and case-insensitive searches, trimmed
queries, empty results, similar names and the exact procedure/duration saved in
a real booking.

The suite creates real temporary bookings. Cleanup changes active test bookings
to `Cancelled` before removing their generated additional surgery types. The
historical booking records remain because the backend has no booking delete API.

```powershell
$env:LIVE_ADMIN_USERNAME='admin007'
$env:LIVE_ADMIN_PASSWORD=[System.Net.NetworkCredential]::new('', (Read-Host 'Admin password' -AsSecureString)).Password
$env:LIVE_USER_EMAIL='qa.test01@example.com'
$env:LIVE_USER_PASSWORD=[System.Net.NetworkCredential]::new('', (Read-Host 'User A password' -AsSecureString)).Password
npm.cmd run test:e2e:surgery-search-live
npx.cmd playwright show-report playwright-report/live --port 9324
```

## Live active surgery type deletion protection

`surgery-procedure-active-delete-live.spec.ts` covers only TC-N03.1 through
TC-N03.3. It verifies that an `Upcoming` booking marks its additional surgery
type as Active and blocks deletion, while types referenced only by `Succeed` or
`Cancelled` bookings can be deleted. It also checks the dropdown, retained
booking history and procedure audit logs against the live backend.

The suite creates real temporary bookings. Because the backend has no booking
delete endpoint, cleanup moves any remaining active test booking to `Cancelled`;
the resulting historical E2E booking records remain in the live database.

```powershell
$env:LIVE_ADMIN_USERNAME='admin007'
$env:LIVE_ADMIN_PASSWORD=[System.Net.NetworkCredential]::new('', (Read-Host 'Admin password' -AsSecureString)).Password
$env:LIVE_USER_EMAIL='qa.test01@example.com'
$env:LIVE_USER_PASSWORD=[System.Net.NetworkCredential]::new('', (Read-Host 'User A password' -AsSecureString)).Password
npm.cmd run test:e2e:surgery-active-delete-live
npx.cmd playwright show-report playwright-report/live --port 9324
```

## Live surgery type permissions and audit history

`surgery-procedure-permissions-audit-live.spec.ts` covers only TC-N02.1 through
TC-N02.8. It verifies owner edit/delete controls, non-owner UI and API restrictions,
Admin management of every user's additional types, created/updated/deleted audit
events, Admin-only history access and rejected operations leaving no success log.

All procedure names are unique and generated procedures are removed in cleanup.
Audit entries remain because they are the permanent history required by this feature.
TC-N02.7 adds `coverage-gap` annotations because the current audit schema does not
store explicit before/after values or the actor role.

Run from `frontend-v` after setting the Admin, User A and User B environment variables:

```powershell
npm.cmd run test:e2e:surgery-permissions-live
npx.cmd playwright show-report playwright-report/live --port 9324
```

## Live additional surgery types

`surgery-procedure-add-use-live.spec.ts` covers only TC-N01.1 through TC-N01.4.
It checks creating an additional surgery type with a duration, visibility to User A,
User B and Admin, selection while booking, invalid values, duplicate names, Refresh,
reopening the manager and a fresh login session. Every generated surgery type has a
unique E2E name and is deleted in test cleanup.

TC-N01.2 creates one real temporary booking as User B to verify that the selected
type and its 70-minute duration reach the live backend. Cleanup changes that booking
to `Cancelled` before deleting the surgery type. The backend has no permanent booking
delete endpoint, so the cancelled E2E booking and its patient record remain in the
live database after the test.

Run from `frontend-v` in PowerShell:

```powershell
$env:LIVE_ADMIN_USERNAME='admin007'
$env:LIVE_ADMIN_PASSWORD=[System.Net.NetworkCredential]::new('', (Read-Host 'Admin password' -AsSecureString)).Password
$env:LIVE_USER_EMAIL='qa.test01@example.com'
$env:LIVE_USER_PASSWORD=[System.Net.NetworkCredential]::new('', (Read-Host 'User A password' -AsSecureString)).Password
$env:LIVE_USER_B_EMAIL='qa.test02@example.com'
$env:LIVE_USER_B_PASSWORD=[System.Net.NetworkCredential]::new('', (Read-Host 'User B password' -AsSecureString)).Password
npm.cmd run test:e2e:surgery-types-live
npx.cmd playwright show-report playwright-report/live --port 9324
```

## Live role-based access and security

`admin-rbac-security-live.spec.ts` covers only TC-A08.1 through TC-A08.3.
It checks Admin/User screen access, User A/User B booking isolation, direct
Admin URL blocking, missing and tampered tokens, Admin-only APIs, foreign
booking reads, Local Storage role spoofing and a rejected attempt to create a
booking for another doctor. The suite does not edit or delete Production data.

```powershell
$env:LIVE_ADMIN_USERNAME='admin007'
$env:LIVE_ADMIN_PASSWORD=[System.Net.NetworkCredential]::new('', (Read-Host 'Admin password' -AsSecureString)).Password
$env:LIVE_USER_EMAIL='qa.test01@example.com'
$env:LIVE_USER_PASSWORD=[System.Net.NetworkCredential]::new('', (Read-Host 'User A password' -AsSecureString)).Password
$env:LIVE_USER_B_EMAIL='qa.test02@example.com'
$env:LIVE_USER_B_PASSWORD=[System.Net.NetworkCredential]::new('', (Read-Host 'User B password' -AsSecureString)).Password
npm.cmd run test:e2e:admin-rbac-live
```

## Live Admin Calendar

`admin-calendar-live.spec.ts` covers only TC-A05.1 through TC-A05.6 from the
Admin Calendar feature. It logs in as the real Admin account, reads bookings,
doctors and holidays from the live backend, and never creates, edits or deletes
data. Scenarios whose required live data does not exist are reported as skipped
instead of being counted as passed.

Run from `frontend-v` in PowerShell:

```powershell
$env:LIVE_ADMIN_USERNAME='admin007'
$env:LIVE_ADMIN_PASSWORD=[System.Net.NetworkCredential]::new('', (Read-Host 'Password for admin007' -AsSecureString)).Password
npm.cmd run test:e2e:admin-calendar-live
npx.cmd playwright show-report playwright-report/live --port 9324
```

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

## Live User CSV export

`user-export-csv-live.spec.ts` covers only TC-U09.1–TC-U09.5 against the deployed website and the real User bookings API. Credentials stay in local environment variables. An optional second User account with no bookings exercises the complete empty-account branch in TC-U09.2.

Run from `frontend-v` in PowerShell:

```powershell
$env:LIVE_USER_EMAIL='user@example.com'
$env:LIVE_USER_PASSWORD=[System.Net.NetworkCredential]::new('', (Read-Host 'User password' -AsSecureString)).Password
$env:LIVE_USER_B_EMAIL='second-user@example.com'
$env:LIVE_USER_B_PASSWORD=[System.Net.NetworkCredential]::new('', (Read-Host 'Second User password' -AsSecureString)).Password

# Optional real User account with no bookings
$env:LIVE_EMPTY_USER_EMAIL='empty-user@example.com'
$env:LIVE_EMPTY_USER_PASSWORD=[System.Net.NetworkCredential]::new('', (Read-Host 'Empty User password' -AsSecureString)).Password

npx.cmd playwright test --config=playwright.live.config.ts e2e/user-export-csv-live.spec.ts
npx.cmd playwright show-report playwright-report/live --port 9324
```

The suite does not create, edit, or delete bookings. It compares downloaded CSV rows with the bookings returned to the logged-in User, verifies ownership isolation, inclusive date filtering, disabled invalid and empty states, UTF-8 BOM, the required 17 columns, every exported field, and Excel-safe numeric HNs. Missing live boundary data is reported with a `coverage-gap` annotation instead of being treated as exercised.

## Live User PDF export

`user-export-pdf-live.spec.ts` covers only TC-U10.1 through TC-U10.5. It uses the same User A and User B environment variables shown above.

```powershell
npm.cmd run test:e2e:user-pdf-live
npx.cmd playwright show-report playwright-report/live --port 9324
```

The suite downloads and parses the real PDF files. It checks single-booking and inclusive date-range exports, User A/User B isolation, invalid and empty states, report metadata, single-case fields, the 10 range-report columns, exact HN/name rows, A4 page size, page numbering, and recovery after invalid filters. A `coverage-gap` annotation identifies live data that cannot currently exercise multiple pages, a leading-zero HN, Thai text, long text, or a date containing only User B bookings. Visual clipping and Print Preview remain marked for manual review.


## PDF Thai font regression

Run `node --test tests/pdf-font.test.mjs` from `frontend-v` to generate and parse synthetic multi-page PDFs locally. These checks exercise Thai SARA AM, SARA AA, tone marks, duplicate/overlapping names and the combined report table without contacting the live backend.

The Thai mapping fix is in `src/components/report/QueueReportPdf.ts`, so it must be deployed before live PDF tests can exercise it. The E2E reader accepts equivalent composed/decomposed Thai text, but no longer removes duplicated vowels or replaces incorrect Latin characters. Existing downloaded PDFs retain their original mapping errors.

## Default command

`npm.cmd run test:e2e` uses the live configuration and discovers the Admin export files plus the User CSV and User PDF export files. Set the credentials required by the files you run. The staging Playwright suites have been removed.
