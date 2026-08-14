# 🏥 Project OR Room
**ระบบจัดการคิวห้องผ่าตัด (Surgery Queue Management)**

ระบบจัดการคิวห้องผ่าตัดอัตโนมัติ ที่คำนวณลำดับคิวจากข้อมูลคนไข้ เช่น อายุ เพศ และประเภทการผ่าตัด ช่วยให้แพทย์ไม่ต้องจัดการคิวด้วยตัวเอง ลดภาระงานและเพิ่มประสิทธิภาพการให้บริการ

---

## ✨ Main Features

- 🔐 ระบบ Login ที่เป็นส่วนตัวสำหรับแพทย์แต่ละท่าน
- 📋 ระบบเพิ่มและจัดการคิวผู้ป่วย
- 🤖 จัดเรียงคิวอัตโนมัติตามอายุ เพศ และวันผ่าตัด
- 🗓️ ปฏิทินแสดงตารางผ่าตัด
- 🛡️ ระบบ Admin สำหรับจัดการบัญชีแพทย์และดูภาพรวมสถิติ

---

## 🛠️ เทคโนโลยีที่ใช้

| Frontend | Backend | Database | Deploy |
|----------|---------|----------|--------|
| Vue 3 | Hono (Cloudflare Workers) | Cloudflare D1 | Vercel |
| TypeScript | | | |
| HTML / CSS | | | |

---

## 🚀 Live Demo
https://project-or-room.vercel.app

## 💻 Installation (Local Development)
```bash
git clone https://github.com/PhenphitchaPhs/Project-OR-Room.git
cd frontend-v
npm install
npm run dev
```

ตอน `npm run dev` คำขอที่ขึ้นต้นด้วย `/api` จะถูก proxy ไปหา worker ให้อัตโนมัติ
(ตั้งไว้ใน `vite.config.ts`) ไม่ต้องตั้งค่าอะไรเพิ่ม

---

## 🔑 การยืนยันตัวตน

ระบบใช้ JWT ที่ backend เซ็นด้วย `JWT_SECRET` ของตัวเอง หลัง login สำเร็จจะได้ token
อายุ 8 ชั่วโมง และทุกคำขอที่ต้องยืนยันตัวตนต้องแนบ `Authorization: Bearer <token>`

ตั้งค่า secret ก่อน deploy backend ครั้งแรก

```bash
cd backend
# สร้างค่าสุ่มยาว ๆ
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
# แล้ววางค่าที่ได้ตอนที่ถาม
npx wrangler secret put JWT_SECRET
```

> ⚠️ ห้ามใส่ `JWT_SECRET` ลงใน `wrangler.toml` หรือ commit ลง repo
> และห้ามเขียน license กับรหัสผ่านของบัญชีจริงไว้ในไฟล์นี้
