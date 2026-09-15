-- Add user-managed surgery types. Built-in procedures remain in procedureDurations.ts.
CREATE TABLE IF NOT EXISTS surgery_procedures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  durationMinutes INTEGER NOT NULL,
  createdBy TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS surgery_procedure_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  procedureId INTEGER,
  procedureName TEXT NOT NULL,
  action TEXT NOT NULL,
  actorLicense TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
