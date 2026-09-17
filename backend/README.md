```
npm install
npm run dev
```

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
