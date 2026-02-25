-- Hospital Management System - PostgreSQL schema
-- Run: createdb hospital && psql -U postgres -d hospital -f schema-postgres.sql

DROP TABLE IF EXISTS opddetails;
DROP TABLE IF EXISTS opd;
DROP TABLE IF EXISTS login;
DROP TABLE IF EXISTS patient;
DROP TABLE IF EXISTS employee;
DROP TABLE IF EXISTS idgenerate;

CREATE TABLE employee (
  "joiningDate" DATE,
  eid VARCHAR(255) PRIMARY KEY,
  "firstName" VARCHAR(255),
  "middleName" VARCHAR(255),
  "lastName" VARCHAR(255),
  birthdate VARCHAR(255),
  gender VARCHAR(255),
  "emailID" VARCHAR(255) UNIQUE,
  mobileno BIGINT UNIQUE,
  "adharNo" BIGINT UNIQUE,
  country VARCHAR(255),
  state VARCHAR(255),
  city VARCHAR(255),
  "residentialAddress" VARCHAR(255),
  "permanentAddress" VARCHAR(255),
  role VARCHAR(255),
  qualification VARCHAR(255),
  specialization VARCHAR(255),
  status INTEGER DEFAULT 1
);

CREATE TABLE patient (
  "registrationDate" DATE,
  pid VARCHAR(255) PRIMARY KEY,
  "firstName" VARCHAR(255),
  "middleName" VARCHAR(255),
  "lastName" VARCHAR(255),
  birthdate VARCHAR(255),
  gender VARCHAR(255),
  "emailID" VARCHAR(255) UNIQUE,
  mobileno BIGINT UNIQUE,
  "adharNo" BIGINT UNIQUE,
  country VARCHAR(255),
  state VARCHAR(255),
  city VARCHAR(255),
  "residentialAddress" VARCHAR(255),
  "permanentAddress" VARCHAR(255),
  "bloodGroup" VARCHAR(5),
  "chronicDiseases" VARCHAR(255),
  "medicineAllergy" VARCHAR(255),
  "doctorId" VARCHAR(255) REFERENCES employee(eid)
);

CREATE TABLE login (
  id VARCHAR(155),
  role VARCHAR(255),
  username VARCHAR(255) PRIMARY KEY,
  password VARCHAR(255)
);

CREATE TABLE idgenerate (
  eid INTEGER PRIMARY KEY,
  pid INTEGER NOT NULL UNIQUE
);

CREATE TABLE opd (
  opdid SERIAL PRIMARY KEY,
  visitdate DATE,
  pid VARCHAR(255) REFERENCES patient(pid),
  doctorid VARCHAR(255) REFERENCES employee(eid),
  status INTEGER NOT NULL
);

CREATE TABLE opddetails (
  opdid INTEGER PRIMARY KEY REFERENCES opd(opdid) ON DELETE CASCADE,
  symptoms VARCHAR(255),
  diagnosis VARCHAR(255),
  "medicinesDose" VARCHAR(255),
  dos VARCHAR(255),
  donts VARCHAR(255),
  investigations VARCHAR(255),
  "followupDate" VARCHAR(255),
  fees VARCHAR(255)
);

CREATE INDEX idx_opd_status ON opd(status);
CREATE INDEX idx_opd_doctorid ON opd(doctorid);
CREATE INDEX idx_opd_pid ON opd(pid);
CREATE INDEX idx_employee_status ON employee(status);
CREATE INDEX idx_employee_role ON employee(role);
