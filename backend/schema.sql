-- ✅ ไฟล์นี้ปลอดภัย: ใช้ CREATE TABLE IF NOT EXISTS และไม่มีคำสั่ง DROP TABLE
-- รันซ้ำกับฐานข้อมูลที่มีข้อมูลอยู่แล้วได้ โดยข้อมูลเดิมจะไม่ถูกลบ
-- (ถ้าตารางมีอยู่แล้ว คำสั่งจะข้ามไปเฉย ๆ ไม่เขียนทับ)

-- ตารางสำหรับเก็บข้อมูลการจองห้องผ่าตัด
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hn TEXT NOT NULL,
  fullName TEXT NOT NULL,
  dob TEXT,
  age INTEGER,
  gender TEXT,
  procedure TEXT,
  date TEXT NOT NULL,
  underlying TEXT,                -- 👈 โรคประจำตัว
  diagnosis TEXT,                 -- 👈 การวินิจฉัยโรค
  cxrDate TEXT,        -- 👈 เพิ่มข้อมูล CXR
  cxrNote TEXT,
  ecgDate TEXT,        -- 👈 เพิ่มข้อมูล ECG
  ecgNote TEXT,
  labDate TEXT,        -- 👈 เพิ่มข้อมูล Lab
  labNote TEXT,
  admDate TEXT,        -- 👈 เพิ่มข้อมูล Admission
  admNote TEXT,
  notes TEXT,
  status TEXT DEFAULT 'Upcoming',   -- Upcoming | Succeed | Cancelled
  room TEXT DEFAULT 'OR-01',
  queueOrder INTEGER DEFAULT 999,   -- 👈 ลำดับคิวที่ผู้ใช้ลากจัดเอง (999 = ใช้การจัดอัตโนมัติ)
  doctorLicense TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- สร้างตารางสำหรับเก็บข้อมูลคุณหมอ (ผู้ใช้งาน)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license TEXT UNIQUE NOT NULL,
  doctorName TEXT NOT NULL,
  email TEXT UNIQUE,                -- 👈 ใช้เข้าสู่ระบบและรับ OTP
  password TEXT NOT NULL,           -- เก็บเป็น hash (bcrypt)
  orNumber TEXT,                    -- 👈 หมายเลขห้องผ่าตัดประจำตัว (201-220)
  day TEXT,
  role TEXT DEFAULT 'user',         -- user | admin
  reset_token TEXT,                 -- 👈 token สำหรับตั้งรหัสผ่านใหม่
  reset_token_expiry INTEGER,       -- 👈 เวลาหมดอายุของ token (epoch ms)
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- สร้างตารางสำหรับเก็บรหัส OTP ที่ใช้ยืนยันอีเมลตอนสมัครสมาชิก
CREATE TABLE IF NOT EXISTS otps (
  email TEXT PRIMARY KEY,           -- 👈 ต้องเป็น UNIQUE เพราะโค้ดใช้ ON CONFLICT(email)
  otp TEXT NOT NULL,
  expiry INTEGER NOT NULL           -- เวลาหมดอายุ (epoch ms) อายุ 5 นาที
);