-- U-HPCMS v3: Patient demographics, transfers

-- Extend patient_org with demographics (optional columns added via migration in sqlite.js)

-- Patient transfers (between facilities / to or from hospital)
CREATE TABLE IF NOT EXISTS patient_transfers (
  id TEXT PRIMARY KEY,
  from_org_id TEXT NOT NULL REFERENCES organizations(id),
  to_org_id TEXT NOT NULL REFERENCES organizations(id),
  from_mrn TEXT NOT NULL,
  to_mrn TEXT,
  transfer_type TEXT NOT NULL CHECK(transfer_type IN ('to_hospital', 'from_hospital', 'between')),
  reason TEXT,
  summary_notes TEXT,
  encounter_id_at_source TEXT REFERENCES encounters(id),
  encounter_id_at_dest TEXT REFERENCES encounters(id),
  transferred_by TEXT,
  transferred_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_patient_transfers_from ON patient_transfers(from_org_id, from_mrn);
CREATE INDEX IF NOT EXISTS idx_patient_transfers_to ON patient_transfers(to_org_id, to_mrn);
