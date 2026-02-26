-- U-HPCMS v4: Noticeboard, Case Manager, Activities, Schedules, Beds, Insurance, Chat

-- Noticeboard
CREATE TABLE IF NOT EXISTS noticeboard (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  created_by TEXT,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_noticeboard_org ON noticeboard(org_id);

-- Case management
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_mrn TEXT NOT NULL,
  doctor_id TEXT,
  case_type TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'closed')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  closed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_cases_org ON cases(org_id);
CREATE INDEX IF NOT EXISTS idx_cases_doctor ON cases(doctor_id);

-- Hospital activities (audit-style log by role/entity)
CREATE TABLE IF NOT EXISTS hospital_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT,
  activity_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activities_org ON hospital_activities(org_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON hospital_activities(user_id);

-- Doctor schedules (recurring weekly slots)
CREATE TABLE IF NOT EXISTS doctor_schedules (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL,
  department_id TEXT REFERENCES departments(id),
  day_of_week INTEGER NOT NULL CHECK(day_of_week >= 0 AND day_of_week <= 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_schedules_org ON doctor_schedules(org_id);
CREATE INDEX IF NOT EXISTS idx_schedules_doctor ON doctor_schedules(doctor_id);

-- Beds per ward (optional; admissions already has bed number as text)
CREATE TABLE IF NOT EXISTS beds (
  id TEXT PRIMARY KEY,
  ward_id TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  bed_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'maintenance')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(ward_id, bed_number)
);
CREATE INDEX IF NOT EXISTS idx_beds_ward ON beds(ward_id);

-- Insurance policies (per patient/org)
CREATE TABLE IF NOT EXISTS insurance_policies (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_mrn TEXT,
  provider_name TEXT NOT NULL,
  policy_number TEXT,
  coverage_details TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'expired', 'cancelled')),
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_insurance_org ON insurance_policies(org_id);

-- Internal messaging: rooms and messages
CREATE TABLE IF NOT EXISTS chat_rooms (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS chat_room_participants (
  room_id TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  joined_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (room_id, user_id)
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
