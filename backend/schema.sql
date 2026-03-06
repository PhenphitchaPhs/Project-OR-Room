DROP TABLE IF EXISTS bookings;
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hn TEXT NOT NULL,
  fullName TEXT NOT NULL,
  dob TEXT,
  age INTEGER,
  gender TEXT,
  procedure TEXT,
  date TEXT NOT NULL,
  urgency TEXT,
  isNpoRisk INTEGER DEFAULT 0,
  isInfected INTEGER DEFAULT 0,
  underlying TEXT,                -- 👈 เพิ่มช่องนี้สำหรับโรคประจำตัว
  notes TEXT,
  status TEXT DEFAULT 'Upcoming', 
  room TEXT DEFAULT 'OR-01',      
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- สร้างตารางสำหรับเก็บข้อมูลคุณหมอ (ผู้ใช้งาน)
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license TEXT UNIQUE NOT NULL,    -- UNIQUE คือห้ามมีเลข License ซ้ำกัน
  doctorName TEXT NOT NULL,
  password TEXT NOT NULL,
  day TEXT,
  role TEXT DEFAULT 'user',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);