-- U-HPCMS v5: Patient documents (PostgreSQL)

CREATE TABLE IF NOT EXISTS patient_documents (
  id VARCHAR(64) PRIMARY KEY,
  org_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_mrn VARCHAR(64) NOT NULL,
  name VARCHAR(512) NOT NULL,
  content_type VARCHAR(128) DEFAULT 'application/octet-stream',
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS idx_patient_documents_org ON patient_documents(org_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_mrn ON patient_documents(patient_mrn);
