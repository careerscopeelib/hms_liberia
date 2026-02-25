-- Hospital Management System - SQLite schema
-- Run: sqlite3 hospital.db < schema-sqlite.sql

DROP TABLE IF EXISTS opddetails;
DROP TABLE IF EXISTS opd;
DROP TABLE IF EXISTS login;
DROP TABLE IF EXISTS patient;
DROP TABLE IF EXISTS employee;
DROP TABLE IF EXISTS idgenerate;

CREATE TABLE employee (
  joiningDate TEXT,
  eid TEXT PRIMARY KEY,
  firstName TEXT,
  middleName TEXT,
  lastName TEXT,
  birthdate TEXT,
  gender TEXT,
  emailID TEXT UNIQUE,
  mobileno INTEGER UNIQUE,
  adharNo INTEGER UNIQUE,
  country TEXT,
  state TEXT,
  city TEXT,
  residentialAddress TEXT,
  permanentAddress TEXT,
  role TEXT,
  qualification TEXT,
  specialization TEXT,
  status INTEGER DEFAULT 1
);

CREATE TABLE patient (
  registrationDate TEXT,
  pid TEXT PRIMARY KEY,
  firstName TEXT,
  middleName TEXT,
  lastName TEXT,
  birthdate TEXT,
  gender TEXT,
  emailID TEXT UNIQUE,
  mobileno INTEGER UNIQUE,
  adharNo INTEGER UNIQUE,
  country TEXT,
  state TEXT,
  city TEXT,
  residentialAddress TEXT,
  permanentAddress TEXT,
  bloodGroup TEXT,
  chronicDiseases TEXT,
  medicineAllergy TEXT,
  doctorId TEXT REFERENCES employee(eid)
);

CREATE TABLE login (
  id TEXT,
  role TEXT,
  username TEXT PRIMARY KEY,
  password TEXT
);

CREATE TABLE idgenerate (
  eid INTEGER PRIMARY KEY,
  pid INTEGER NOT NULL UNIQUE
);

CREATE TABLE opd (
  opdid INTEGER PRIMARY KEY AUTOINCREMENT,
  visitdate TEXT,
  pid TEXT REFERENCES patient(pid),
  doctorid TEXT REFERENCES employee(eid),
  status INTEGER NOT NULL
);

CREATE TABLE opddetails (
  opdid INTEGER PRIMARY KEY REFERENCES opd(opdid) ON DELETE CASCADE,
  symptoms TEXT,
  diagnosis TEXT,
  medicinesDose TEXT,
  dos TEXT,
  donts TEXT,
  investigations TEXT,
  followupDate TEXT,
  fees TEXT
);

CREATE INDEX idx_opd_status ON opd(status);
CREATE INDEX idx_opd_doctorid ON opd(doctorid);
CREATE INDEX idx_opd_pid ON opd(pid);
CREATE INDEX idx_employee_status ON employee(status);
CREATE INDEX idx_employee_role ON employee(role);
