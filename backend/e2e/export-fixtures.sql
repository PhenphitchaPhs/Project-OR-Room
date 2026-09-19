-- Synthetic fixtures for a dedicated staging database only.
-- seed-export-staging.ts fills the password hash placeholder and executes this file.

DELETE FROM bookings;
DELETE FROM patients;
DELETE FROM users;

INSERT INTO users (license, doctorName, password, orNumber, role)
VALUES ('e2e-export-admin', 'E2E Export Admin', '{{PASSWORD_HASH}}', '201', 'admin');

INSERT INTO users (license, doctorName, password, orNumber, role)
VALUES ('e2e-export-doctor-a', 'Dr E2E Alpha', '{{PASSWORD_HASH}}', '201', 'user');

INSERT INTO users (license, doctorName, password, orNumber, role)
VALUES ('e2e-export-doctor-b', 'Dr E2E Beta', '{{PASSWORD_HASH}}', '202', 'user');

INSERT INTO users (license, doctorName, password, orNumber, role)
VALUES ('e2e-export-doctor-c', 'Dr E2E Gamma', '{{PASSWORD_HASH}}', '206', 'user');

INSERT INTO patients (hn, fullName, dob, gender, underlying, createdAt, updatedAt) VALUES
  ('0433557', 'E2E Export Alpha', '1990-01-01', 'male', 'Synthetic condition A', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('9000002', 'E2E Export Beta', '1980-02-02', 'female', 'Synthetic condition B', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('9000003', 'E2E Export Gamma', '1970-03-03', 'male', 'Synthetic condition C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('9000004', 'E2E Export Delta', '1985-04-04', 'female', 'Synthetic condition D', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('9000005', 'E2E Export Epsilon', '1995-05-05', 'male', 'Synthetic condition E', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('9000006', 'E2E Export Zeta', '1975-06-06', 'female', 'Synthetic condition F', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('9000007', 'E2E Export Eta', '1992-07-07', 'male', 'Synthetic condition G', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('9000008', 'E2E Export Theta', '1988-08-08', 'female', 'Synthetic condition H', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('9000009', 'E2E Export Iota', '1982-09-09', 'male', 'Synthetic condition I', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('9000010', 'E2E Export Kappa', '1998-10-10', 'female', 'Synthetic condition J', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO bookings
  (id, hn, fullName, dob, age, gender, procedure, date, underlying, diagnosis,
   surgeryDetails, cxrDate, cxrNote, ecgDate, ecgNote, labDate, labNote,
   admDate, admNote, notes, status, room, queueOrder, doctorLicense)
VALUES
  (9900001, '0433557', 'E2E Export Alpha', '1990-01-01', 36, 'male', 'Synthetic Procedure A', '2099-02-01', 'Synthetic condition A', 'Synthetic diagnosis A', 'Synthetic details A', '2099-01-01', 'CXR clear', NULL, NULL, NULL, NULL, NULL, NULL, 'Synthetic note A', 'Upcoming', 'OR-201', 1, 'e2e-export-doctor-a'),
  (9900002, '9000002', 'E2E Export Beta', '1980-02-02', 46, 'female', 'Synthetic Procedure B', '2099-02-28', 'Synthetic condition B', 'Diagnosis, with comma', NULL, NULL, NULL, '2099-01-02', 'ECG clear', NULL, NULL, NULL, NULL, 'Synthetic note B', 'Succeed', 'OR-202', 1, 'e2e-export-doctor-b'),
  (9900003, '9000003', 'E2E Export Gamma', '1970-03-03', 56, 'male', 'Synthetic Procedure C', '2099-03-01', 'Synthetic condition C', 'Synthetic diagnosis C', NULL, NULL, NULL, NULL, NULL, '2099-01-03', 'Labs normal', NULL, NULL, 'Synthetic note C', 'Cancelled', 'OR-206', 1, 'e2e-export-doctor-c'),
  (9900004, '9000004', 'E2E Export Delta', '1985-04-04', 41, 'female', 'Synthetic Procedure D', '2099-01-31', 'Synthetic condition D', 'Synthetic diagnosis D', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2099-01-20', 'Admit as planned', 'Synthetic note D', 'Upcoming', 'OR-202', 2, 'e2e-export-doctor-b'),
  (9900005, '9000005', 'E2E Export Epsilon', '1995-05-05', 31, 'male', 'Synthetic Procedure E', '2099-02-15', 'Synthetic condition E', 'Synthetic diagnosis E', 'Details with "quoted" text', NULL, NULL, '2099-01-15', 'ECG normal', '2099-01-16', 'Labs normal', NULL, NULL, 'Synthetic note E', 'Upcoming', 'OR-206', 2, 'e2e-export-doctor-c'),
  (9900006, '9000006', 'E2E Export Zeta', '1975-06-06', 51, 'female', 'Synthetic Procedure F', '2099-02-10', 'Synthetic condition F', 'Synthetic diagnosis F', NULL, '2099-01-10', 'CXR clear', NULL, NULL, NULL, NULL, NULL, NULL, 'Synthetic note F', 'Upcoming', 'OR-209', 1, 'e2e-export-doctor-b'),
  (9900007, '9000007', 'E2E Export Eta', '1992-07-07', 34, 'male', 'Synthetic Procedure G', '2099-02-20', 'Synthetic condition G', 'Synthetic diagnosis G', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Completed', 'OR-206', 3, 'e2e-export-doctor-c'),
  (9900008, '9000008', 'E2E Export Theta', '1988-08-08', 38, 'female', 'Synthetic Procedure H', '2099-02-18', 'Synthetic condition H', 'Synthetic diagnosis H', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Upcoming', 'OR-201', 2, 'e2e-export-doctor-a'),
  (9900009, '9000009', 'E2E Export Iota', '1982-09-09', 44, 'male', 'Synthetic Procedure I', '2099-02-20', 'Synthetic condition I', 'Synthetic diagnosis I', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Completed', 'OR-209', 2, 'e2e-export-doctor-b'),
  (9900010, '9000010', 'E2E Export Kappa', '1998-10-10', 28, 'female', 'Synthetic Procedure J', '2099-02-15', 'Synthetic condition J', 'Synthetic diagnosis J', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Upcoming', 'OR-201', 3, 'e2e-unlisted-doctor');
