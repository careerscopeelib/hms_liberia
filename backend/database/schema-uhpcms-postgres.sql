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
