-- U-HPCMS tables for PostgreSQL (super-admin login, orgs, roles, audit)
-- Run after schema-postgres.sql (legacy tables). Safe to run multiple times.

CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(32) NOT NULL CHECK (type IN ('hospital', 'clinic', 'pharmacy')),
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  subscription_plan VARCHAR(64) DEFAULT 'standard',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  settings TEXT
);

CREATE TABLE IF NOT EXISTS org_modules (
  org_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_name VARCHAR(64) NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (org_id, module_name)
);

CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  org_id VARCHAR(64) REFERENCES organizations(id),
  permissions TEXT
);

CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(64) PRIMARY KEY,
  org_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wards (
  id VARCHAR(64) PRIMARY KEY,
  org_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  bed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_org (
  id SERIAL PRIMARY KEY,
  mrn VARCHAR(64) NOT NULL,
  org_id VARCHAR(64) NOT NULL REFERENCES organizations(id),
  pid VARCHAR(64),
  full_name VARCHAR(255),
  date_of_birth VARCHAR(32),
  gender VARCHAR(32),
  phone VARCHAR(64),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, mrn)
);

CREATE TABLE IF NOT EXISTS encounters (
  id VARCHAR(64) PRIMARY KEY,
  org_id VARCHAR(64) NOT NULL REFERENCES organizations(id),
  patient_mrn VARCHAR(64) NOT NULL,
  department_id VARCHAR(64) REFERENCES departments(id),
  doctor_id VARCHAR(64),
  status VARCHAR(32) NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'triage', 'consultation', 'admitted', 'discharged', 'cancelled')),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  triage_notes TEXT,
  soap_notes TEXT,
  referral_notes TEXT
);

CREATE TABLE IF NOT EXISTS billing_charges (
  id VARCHAR(64) PRIMARY KEY,
  encounter_id VARCHAR(64) NOT NULL REFERENCES encounters(id),
  service_code VARCHAR(64) NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(64) PRIMARY KEY,
  encounter_id VARCHAR(64) NOT NULL REFERENCES encounters(id),
  total_amount REAL NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  invoice_id VARCHAR(64) NOT NULL REFERENCES invoices(id),
  amount REAL NOT NULL,
  currency VARCHAR(8) NOT NULL,
  method VARCHAR(64) DEFAULT 'cash',
  reference VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS triage (
  id SERIAL PRIMARY KEY,
  encounter_id VARCHAR(64) NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  recorded_by VARCHAR(64),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  vitals TEXT,
  severity VARCHAR(32),
  notes TEXT,
  UNIQUE (encounter_id)
);

CREATE TABLE IF NOT EXISTS lab_orders (
  id VARCHAR(64) PRIMARY KEY,
  encounter_id VARCHAR(64) NOT NULL REFERENCES encounters(id),
  ordered_by VARCHAR(64),
  ordered_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  test_name VARCHAR(255),
  test_code VARCHAR(64),
  result_value TEXT,
  result_unit VARCHAR(32),
  result_at TIMESTAMPTZ,
  result_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id VARCHAR(64) PRIMARY KEY,
  encounter_id VARCHAR(64) NOT NULL REFERENCES encounters(id),
  prescribed_by VARCHAR(64),
  prescribed_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  store_id VARCHAR(64),
  dispensed_at TIMESTAMPTZ,
  dispensed_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS admissions (
  id VARCHAR(64) PRIMARY KEY,
  encounter_id VARCHAR(64) NOT NULL REFERENCES encounters(id),
  ward_id VARCHAR(64) NOT NULL REFERENCES wards(id),
  bed VARCHAR(64) NOT NULL,
  admitted_at TIMESTAMPTZ DEFAULT NOW(),
  discharged_at TIMESTAMPTZ,
  admitted_by VARCHAR(64),
  discharged_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS system_users (
  id VARCHAR(64) PRIMARY KEY,
  org_id VARCHAR(64) REFERENCES organizations(id),
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id VARCHAR(64) NOT NULL REFERENCES roles(id),
  department_id VARCHAR(64) REFERENCES departments(id),
  full_name VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, email)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(64),
  org_id VARCHAR(64),
  module VARCHAR(64),
  action VARCHAR(64),
  payload TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(64) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_addons (
  org_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  addon_name VARCHAR(64) NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (org_id, addon_name)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_org ON audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_encounters_org ON encounters(org_id);
CREATE INDEX IF NOT EXISTS idx_encounters_status ON encounters(status);
CREATE INDEX IF NOT EXISTS idx_patient_org_org ON patient_org(org_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_encounter ON lab_orders(encounter_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_encounter ON prescriptions(encounter_id);
CREATE INDEX IF NOT EXISTS idx_admissions_ward ON admissions(ward_id);
