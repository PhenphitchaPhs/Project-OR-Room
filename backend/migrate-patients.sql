-- ============================================================
-- Migration: แยกข้อมูลผู้ป่วยออกจากตารางการจอง
-- ============================================================
-- ไฟล์นี้ปลอดภัย ไม่มีการลบข้อมูลใด ๆ
--   1) สร้างตาราง patients (ถ้ายังไม่มี)
--   2) คัดลอกข้อมูลผู้ป่วยจากตาราง bookings มาเก็บไว้
--
-- หลังรันไฟล์นี้ ข้อมูลผู้ป่วยจะอยู่ในตาราง patients อย่างถาวร
-- ทำให้สามารถลบรายการจองได้โดยข้อมูลผู้ป่วยไม่หายไปด้วย
-- ============================================================


-- 1) สร้างตารางผู้ป่วย
CREATE TABLE IF NOT EXISTS patients (
  hn TEXT PRIMARY KEY,
  fullName TEXT NOT NULL,
  dob TEXT,
  gender TEXT,
  underlying TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- 2) คัดลอกข้อมูลผู้ป่วยจากรายการจอง "ล่าสุด" ของแต่ละ HN
--    (INSERT OR IGNORE = ถ้ามี HN นั้นอยู่แล้วจะข้ามไป ไม่เขียนทับ)
INSERT OR IGNORE INTO patients (hn, fullName, dob, gender, underlying)
SELECT hn, fullName, dob, gender, underlying
FROM bookings
WHERE id IN (SELECT MAX(id) FROM bookings GROUP BY hn)
  AND hn IS NOT NULL
  AND fullName IS NOT NULL;