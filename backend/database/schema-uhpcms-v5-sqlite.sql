-- U-HPCMS v5: Patient documents (upload/store metadata + content as base64)

CREATE TABLE IF NOT EXISTS patient_documents (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_mrn TEXT NOT NULL,
  name TEXT NOT NULL,
  content_type TEXT DEFAULT 'application/octet-stream',
  content TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_patient_documents_org ON patient_documents(org_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_mrn ON patient_documents(patient_mrn);
