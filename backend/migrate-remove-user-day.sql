-- Existing databases only. The users.day preference is no longer used.
-- Back up the target database before applying this migration once.
-- Fresh databases created from schema.sql already omit this column.
ALTER TABLE users DROP COLUMN day;
