-- Existing databases only: deploy the backend that no longer reads/writes dob first.
-- Back up the target database before applying; stored birth dates will be removed.
-- Run once. Fresh databases created from schema.sql already omit these columns.
ALTER TABLE patients DROP COLUMN dob;
ALTER TABLE bookings DROP COLUMN dob;
