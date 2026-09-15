-- Add audit history for user-managed surgery type changes.
CREATE TABLE IF NOT EXISTS surgery_procedure_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  procedureId INTEGER,
  procedureName TEXT NOT NULL,
  action TEXT NOT NULL,
  actorLicense TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
