-- U-HPCMS v2: Triage, Lab, Inpatient, Pharmacy, Clinic, HR, Assets, Add-ons

-- Organization add-ons (feature flags per org)
CREATE TABLE IF NOT EXISTS org_addons (
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  addon_name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (org_id, addon_name)
);

-- Pharmacy stores per organization
CREATE TABLE IF NOT EXISTS pharmacy_stores (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Services & billing codes (per org)
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  default_amount REAL,
  default_currency TEXT DEFAULT 'USD',
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(org_id, code)
);

-- Triage: vitals and severity per encounter
CREATE TABLE IF NOT EXISTS triage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  recorded_by TEXT,
  recorded_at TEXT DEFAULT (datetime('now')),
  vitals TEXT,
  severity TEXT,
  notes TEXT,
  UNIQUE(encounter_id)
);

-- Lab orders
CREATE TABLE IF NOT EXISTS lab_orders (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(id),
  ordered_by TEXT,
  ordered_at TEXT DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sample_collected', 'processing', 'result_ready', 'cancelled')),
  test_name TEXT,
  test_code TEXT,
  result_value TEXT,
  result_unit TEXT,
  result_at TEXT,
  result_by TEXT
);

-- Admissions (inpatient: ward, bed)
CREATE TABLE IF NOT EXISTS admissions (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(id),
  ward_id TEXT NOT NULL REFERENCES wards(id),
  bed TEXT NOT NULL,
  admitted_at TEXT DEFAULT (datetime('now')),
  discharged_at TEXT,
  admitted_by TEXT,
  discharged_by TEXT
);

-- Drugs catalog (for prescriptions)
CREATE TABLE IF NOT EXISTS drugs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  code TEXT,
  unit TEXT DEFAULT 'unit',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Prescriptions (from doctor)
CREATE TABLE IF NOT EXISTS prescriptions (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(id),
  prescribed_by TEXT,
  prescribed_at TEXT DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'validated', 'dispensed', 'cancelled')),
  store_id TEXT REFERENCES pharmacy_stores(id),
  dispensed_at TEXT,
  dispensed_by TEXT
);

-- Prescription line items
CREATE TABLE IF NOT EXISTS prescription_items (
  id TEXT PRIMARY KEY,
  prescription_id TEXT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  drug_id TEXT NOT NULL REFERENCES drugs(id),
  quantity REAL NOT NULL,
  dosage TEXT,
  duration TEXT
);

-- Pharmacy inventory (per store, per drug)
CREATE TABLE IF NOT EXISTS pharmacy_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id TEXT NOT NULL REFERENCES pharmacy_stores(id),
  drug_id TEXT NOT NULL REFERENCES drugs(id),
  quantity REAL NOT NULL DEFAULT 0,
  batch TEXT,
  expiry TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_store ON pharmacy_inventory(store_id);

-- Appointments (clinic workflow)
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  patient_mrn TEXT NOT NULL,
  department_id TEXT REFERENCES departments(id),
  doctor_id TEXT,
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'checked_in', 'completed', 'cancelled', 'no_show')),
  encounter_id TEXT REFERENCES encounters(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Insurance claims
CREATE TABLE IF NOT EXISTS insurance_claims (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  policy_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'approved', 'rejected', 'reimbursed')),
  submitted_at TEXT,
  reimbursed_at TEXT,
  amount_claimed REAL,
  amount_reimbursed REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Assets (equipment)
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  code TEXT,
  department_id TEXT REFERENCES departments(id),
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'maintenance', 'retired')),
  last_maintenance TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Add-on catalog (super-admin installs)
CREATE TABLE IF NOT EXISTS addon_catalog (
  name TEXT PRIMARY KEY,
  display_name TEXT,
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- HR: attendance (simplified: check-in/out per user per day)
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES system_users(id),
  date TEXT NOT NULL,
  check_in TEXT,
  check_out TEXT,
  UNIQUE(user_id, date)
);

-- HR: leave requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES system_users(id),
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  approved_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lab_orders_encounter ON lab_orders(encounter_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_encounter ON prescriptions(encounter_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_admissions_encounter ON admissions(encounter_id);
CREATE INDEX IF NOT EXISTS idx_appointments_org ON appointments(org_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON appointments(scheduled_at);
