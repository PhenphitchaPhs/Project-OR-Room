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
  underlying TEXT,                
  cxrDate TEXT,        -- 👈 เพิ่มข้อมูล CXR
  cxrNote TEXT,
  ecgDate TEXT,        -- 👈 เพิ่มข้อมูล ECG
  ecgNote TEXT,
  labDate TEXT,        -- 👈 เพิ่มข้อมูล Lab
  labNote TEXT,
  admDate TEXT,        -- 👈 เพิ่มข้อมูล Admission
  admNote TEXT,
  notes TEXT,
  status TEXT DEFAULT 'Upcoming', 
  room TEXT DEFAULT 'OR-01', 
  doctorLicense TEXT,     
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- สร้างตารางสำหรับเก็บข้อมูลคุณหมอ (ผู้ใช้งาน)
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license TEXT UNIQUE NOT NULL,    
  doctorName TEXT NOT NULL,
  password TEXT NOT NULL,
  day TEXT,
  role TEXT DEFAULT 'user',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);