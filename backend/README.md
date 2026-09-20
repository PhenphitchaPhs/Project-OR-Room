```
npm install
npm run dev
```

## Login session lifetime

User and admin sessions expire 48 hours after login. Activity does not extend this period. After deploying the backend change, users must log in again to receive a new 48-hour token; existing tokens retain their original expiry. The frontend redirects to login when an authenticated API request returns HTTP 401.

## Database setup and migrations

Run the base schema first, then run each migration once against the target D1 database:

```bash
npx wrangler d1 execute or_room_db --remote --file=./schema.sql
npx wrangler d1 execute or_room_db --remote --file=./migrate-patients.sql
npx wrangler d1 execute or_room_db --remote --file=./migrate-add-duration-minutes.sql
npx wrangler d1 execute or_room_db --remote --file=./migrate-surgery-procedures.sql
npx wrangler d1 execute or_room_db --remote --file=./migrate-surgery-procedure-logs.sql
npx wrangler d1 execute or_room_db --remote --file=./migrate-add-surgery-details.sql
```

For local development, replace `--remote` with `--local`. Do not run the duration migration again after it has already been applied, because SQLite/D1 does not support `ADD COLUMN IF NOT EXISTS`.

The surgery procedures migration creates the table for user-managed surgery types. Built-in surgery types remain protected in the application and are not editable or deletable.

For databases where `migrate-surgery-procedures.sql` was already applied, run `migrate-surgery-procedure-logs.sql` once to enable the audit history.

For an existing database, run `migrate-add-surgery-details.sql` once before deploying the backend that saves Surgery Details. This adds the `surgeryDetails` column required to retain and return the value.

## Isolated export E2E staging

`wrangler.toml` has a separate `staging` Worker and D1 binding (`or_room_staging`). It does not share the production database, and staging has no cron trigger. Provision it with a Cloudflare-authenticated Wrangler CLI:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File e2e\provision-staging.ps1
```

The script applies the schema, deploys the staging Worker with an independent random `JWT_SECRET`, resets the dedicated staging `bookings`, `patients`, and `users` tables, and inserts only synthetic export fixtures. It generates a test-only password and saves the staging URL and password to `frontend-v/.env.staging.local`, which is ignored by Git. Re-running the script resets those staging tables again.

Run the browser plus real Worker/D1 integration suite from `frontend-v`:

```powershell
$env:PLAYWRIGHT_STAGING='1'
$env:PLAYWRIGHT_BROWSER_CHANNEL='chrome'
npm.cmd run test:e2e -- --project=chromium e2e/admin-export-staging.spec.ts
```

The staging test loads `.env.staging.local`, requires the Vite API proxy target to match the staging Worker URL, logs in through `/api/login`, and exercises the real export endpoint. The test database contains ten synthetic bookings with fixed January/March 2099 boundary dates, multiple doctors and rooms, all CSV statuses, and a leading-zero HN; no production records are copied.

```
open http://localhost:3000

Brevo configuration for tomorrow surgery notifications:
Set BREVO_API_KEY, BREVO_SENDER_EMAIL, and optional BREVO_SENDER_NAME in .dev.vars.
For production, set them with wrangler secret put. The notification code calls the Brevo REST API directly, so no EmailJS template is required.

แจ้งเตือนคิวผ่าตัดวันถัดไป

ตั้งค่า secrets สำหรับ EmailJS ด้วยคำสั่ง wrangler secret put สำหรับ EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY และ EMAILJS_PRIVATE_KEY

สามารถตั้ง TOMORROW_EMAILJS_TEMPLATE_ID เพิ่มได้ หากใช้ template แยกจาก OTP โดย template ควรรองรับตัวแปร to_email, doctor_name, surgery_date, booking_count, subject และ booking_details

Cron ถูกตั้งเป็น 0 15 * * * ซึ่งตรงกับเวลา 22:00 น. ประเทศไทย ระบบจะส่งเฉพาะ booking ของแพทย์แต่ละคนที่มี email และยังไม่อยู่ในสถานะ Cancelled, Completed หรือ Succeed

สำหรับทดสอบ ให้ส่ง POST ไปที่ /api/notify-tomorrow พร้อม Authorization Bearer ของ admin และดูประวัติการส่งได้ที่ GET /api/notification-logs
```
