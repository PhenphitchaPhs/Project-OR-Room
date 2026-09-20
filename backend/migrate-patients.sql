

CREATE TABLE IF NOT EXISTS patients (
  hn TEXT PRIMARY KEY,
  fullName TEXT NOT NULL,
  gender TEXT,
  underlying TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO patients (hn, fullName, gender, underlying)
SELECT hn, fullName, gender, underlying
FROM bookings
WHERE id IN (SELECT MAX(id) FROM bookings GROUP BY hn)
  AND hn IS NOT NULL
  AND fullName IS NOT NULL;