const db = require('../db');
const bcrypt = require('bcryptjs');

async function seed() {
  await db.init();

  const hasOrg = await db.get('SELECT id FROM organizations LIMIT 1');
  if (hasOrg) {
    console.log('U-HPCMS seed already applied.');
    return;
  }

  const orgId = 'org_demo1';
  await db.run(
    'INSERT INTO organizations (id, name, type, status, subscription_plan) VALUES ($1, $2, $3, $4, $5)',
    [orgId, 'Unified Demo Hospital', 'hospital', 'active', 'standard']
  );

  const modules = ['hospital', 'clinic', 'pharmacy', 'lab', 'billing', 'pharmacy_inventory', 'hr', 'reporting'];
  for (const m of modules) {
    await db.run(
      'INSERT OR IGNORE INTO org_modules (org_id, module_name, enabled) VALUES ($1, $2, $3)',
      [orgId, m, 1]
    );
  }

  await db.run(
    "INSERT OR IGNORE INTO system_settings (key, value) VALUES ('lrd_per_usd', '193.5')"
  );

  const roleId = 'role_org_admin';
  await db.run(
    'INSERT OR IGNORE INTO roles (id, name, org_id) VALUES ($1, $2, $3)',
    [roleId, 'org_admin', orgId]
  );

  const superRoleId = 'role_super_admin';
  await db.run(
    'INSERT OR IGNORE INTO roles (id, name, org_id) VALUES ($1, $2, $3)',
    [superRoleId, 'super_admin', null]
  );

  const hash = await bcrypt.hash('admin123', 10);
  const superId = 'su_1';
  await db.run(
    'INSERT OR IGNORE INTO system_users (id, org_id, email, password_hash, role_id, full_name, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [superId, null, 'super@uhpcms.local', hash, superRoleId, 'Super Admin', 'active']
  );

  const deptId = 'dept_1';
  await db.run(
    'INSERT OR IGNORE INTO departments (id, org_id, name) VALUES ($1, $2, $3)',
    [deptId, orgId, 'General OPD']
  );

  await db.run(
    'INSERT OR IGNORE INTO patient_org (mrn, org_id, pid) VALUES ($1, $2, $3)',
    ['MRN001', orgId, 'P101']
  );
  await db.run(
    'INSERT OR IGNORE INTO encounters (id, org_id, patient_mrn, department_id, status) VALUES ($1, $2, $3, $4, $5)',
    ['enc_demo1', orgId, 'MRN001', deptId, 'registered']
  );

  console.log('U-HPCMS seed done. Super-admin: super@uhpcms.local / admin123');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
