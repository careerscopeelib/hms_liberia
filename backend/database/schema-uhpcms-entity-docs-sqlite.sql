-- Entity-scoped documents (lab_order, insurance, case, employee) - SQLite
CREATE TABLE IF NOT EXISTS entity_documents (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  name TEXT NOT NULL,
  content_type TEXT DEFAULT 'application/octet-stream',
  content TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_entity_documents_org ON entity_documents(org_id);
CREATE INDEX IF NOT EXISTS idx_entity_documents_entity ON entity_documents(entity_type, entity_id);
