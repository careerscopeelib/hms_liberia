-- U-HPCMS extension schema (SQLite) - run after base schema
-- Organizations, roles, modules, encounters, billing (USD/LRD), audit

-- Organizations (Hospital, Clinic, Pharmacy)
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('hospital', 'clinic', 'pharmacy')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
  subscription_plan TEXT DEFAULT 'standard',
  created_at TEXT DEFAULT (datetime('now')),
  settings TEXT
);

-- Organization modules (feature flags)
CREATE TABLE IF NOT EXISTS org_modules (
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (org_id, module_name)
);

-- System roles (super_admin, org_admin, doctor, nurse, receptionist, pharmacist, etc.)
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  org_id TEXT REFERENCES organizations(id),
  permissions TEXT
);

-- Departments per organization
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Wards (hospital only)
CREATE TABLE IF NOT EXISTS wards (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bed_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- System users (replaces login for U-HPCMS; links to org)
CREATE TABLE IF NOT EXISTS system_users (
  id TEXT PRIMARY KEY,
  org_id TEXT REFERENCES organizations(id),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES roles(id),
  department_id TEXT REFERENCES departments(id),
  full_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(org_id, email)
);

-- Patient MRN and org scope (extends patient concept)
CREATE TABLE IF NOT EXISTS patient_org (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mrn TEXT NOT NULL,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  pid TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(org_id, mrn)
);

-- Encounters (visit/consultation session)
CREATE TABLE IF NOT EXISTS encounters (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  patient_mrn TEXT NOT NULL,
  department_id TEXT REFERENCES departments(id),
  doctor_id TEXT,
  status TEXT NOT NULL DEFAULT 'registered' CHECK(status IN ('registered', 'triage', 'consultation', 'admitted', 'discharged', 'cancelled')),
  registered_at TEXT DEFAULT (datetime('now')),
  closed_at TEXT,
  triage_notes TEXT,
  soap_notes TEXT,
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

-- Billing: currency in USD or LRD
CREATE TABLE IF NOT EXISTS billing_charges (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(id),
  service_code TEXT NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK(currency IN ('USD', 'LRD')),
  quantity INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(id),
  total_amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK(currency IN ('USD', 'LRD')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'partial', 'cancelled')),
  created_at TEXT DEFAULT (datetime('now')),
  paid_at TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  amount REAL NOT NULL,
  currency TEXT NOT NULL CHECK(currency IN ('USD', 'LRD')),
  method TEXT DEFAULT 'cash',
  reference TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  org_id TEXT,
  module TEXT,
  action TEXT,
  payload TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- System settings (e.g. USD/LRD rate, super-admin)
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_encounters_org ON encounters(org_id);
CREATE INDEX IF NOT EXISTS idx_encounters_status ON encounters(status);
CREATE INDEX IF NOT EXISTS idx_billing_encounter ON billing_charges(encounter_id);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
