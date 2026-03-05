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
  isNpoRisk INTEGER DEFAULT 0, -- 0 = False, 1 = True
  isInfected INTEGER DEFAULT 0, -- 0 = False, 1 = True
  notes TEXT,
  status TEXT DEFAULT 'Upcoming', -- 👈 เพิ่มอันนี้
  room TEXT DEFAULT 'OR-01',      -- 👈 เพิ่มอันนี้
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);