-- Entity-scoped documents (lab_order, insurance, case, employee) - PostgreSQL
CREATE TABLE IF NOT EXISTS entity_documents (
  id VARCHAR(64) PRIMARY KEY,
  org_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  name VARCHAR(512) NOT NULL,
  content_type VARCHAR(128) DEFAULT 'application/octet-stream',
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS idx_entity_documents_org ON entity_documents(org_id);
CREATE INDEX IF NOT EXISTS idx_entity_documents_entity ON entity_documents(entity_type, entity_id);
