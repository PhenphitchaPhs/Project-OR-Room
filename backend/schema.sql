

CREATE TABLE IF NOT EXISTS patients (
  hn TEXT PRIMARY KEY,              -- 👈 หมายเลข HN ห้ามซ้ำ
  fullName TEXT NOT NULL,
  dob TEXT,
  gender TEXT,
  underlying TEXT,                  -- 👈 โรคประจำตัว
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

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
  surgeryDetails TEXT,            -- 👈 รายละเอียดเพิ่มเติมเกี่ยวกับการผ่าตัด
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

CREATE TABLE IF NOT EXISTS otps (
  email TEXT PRIMARY KEY,           -- 👈 ต้องเป็น UNIQUE เพราะโค้ดใช้ ON CONFLICT(email)
  otp TEXT NOT NULL,
  expiry INTEGER NOT NULL           -- เวลาหมดอายุ (epoch ms) อายุ 5 นาที
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notificationType TEXT NOT NULL,
  targetDate TEXT NOT NULL,
  doctorLicense TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL,
  bookingCount INTEGER NOT NULL DEFAULT 0,
  errorMessage TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
