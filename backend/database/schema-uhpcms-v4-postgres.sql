-- U-HPCMS v4: Noticeboard, Case Manager, Activities, Schedules, Beds, Insurance, Chat (PostgreSQL)

CREATE TABLE IF NOT EXISTS noticeboard (
  id VARCHAR(64) PRIMARY KEY,
  org_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(512) NOT NULL,
  content TEXT,
  created_by VARCHAR(64),
  is_pinned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_noticeboard_org ON noticeboard(org_id);

CREATE TABLE IF NOT EXISTS cases (
  id VARCHAR(64) PRIMARY KEY,
  org_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_mrn VARCHAR(64) NOT NULL,
  doctor_id VARCHAR(64),
  case_type VARCHAR(64),
  status VARCHAR(32) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cases_org ON cases(org_id);
CREATE INDEX IF NOT EXISTS idx_cases_doctor ON cases(doctor_id);

CREATE TABLE IF NOT EXISTS hospital_activities (
  id SERIAL PRIMARY KEY,
  org_id VARCHAR(64) NOT NULL REFERENCES organizations(id),
  user_id VARCHAR(64),
  activity_type VARCHAR(128) NOT NULL,
  entity_type VARCHAR(64),
  entity_id VARCHAR(64),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activities_org ON hospital_activities(org_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON hospital_activities(user_id);

CREATE TABLE IF NOT EXISTS doctor_schedules (
  id VARCHAR(64) PRIMARY KEY,
  org_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  doctor_id VARCHAR(64) NOT NULL,
  department_id VARCHAR(64) REFERENCES departments(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time VARCHAR(16) NOT NULL,
  end_time VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_schedules_org ON doctor_schedules(org_id);
CREATE INDEX IF NOT EXISTS idx_schedules_doctor ON doctor_schedules(doctor_id);

CREATE TABLE IF NOT EXISTS beds (
  id VARCHAR(64) PRIMARY KEY,
  ward_id VARCHAR(64) NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  bed_number VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ward_id, bed_number)
);
CREATE INDEX IF NOT EXISTS idx_beds_ward ON beds(ward_id);

CREATE TABLE IF NOT EXISTS insurance_policies (
  id VARCHAR(64) PRIMARY KEY,
  org_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_mrn VARCHAR(64),
  provider_name VARCHAR(255) NOT NULL,
  policy_number VARCHAR(128),
  coverage_details TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_insurance_org ON insurance_policies(org_id);

CREATE TABLE IF NOT EXISTS chat_rooms (
  id VARCHAR(64) PRIMARY KEY,
  org_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS chat_room_participants (
  room_id VARCHAR(64) NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR(64) PRIMARY KEY,
  room_id VARCHAR(64) NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id VARCHAR(64) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
