/**
 * Add portal demo users (doctor, nurse, accountant, etc.) to an existing organization.
 * Use when you already ran seed-uhpcms but only have super_admin, or when you want
 * to add these users to a different org.
 *
 * Usage:
 *   node scripts/seed-uhpcms-portal-users.js
 *   node scripts/seed-uhpcms-portal-users.js org_demo1
 */
const db = require('../db');
const bcrypt = require('bcryptjs');

const DEFAULT_ORG_ID = process.argv[2] || null;

const ORG_ROLES = [
  ['doctor', 'doctor', 'Doctor Demo'],
  ['nurse', 'nurse', 'Nurse Demo'],
  ['accountant', 'accountant', 'Accountant Demo'],
  ['receptionist', 'receptionist', 'Receptionist Demo'],
  ['pharmacist', 'pharmacist', 'Pharmacist Demo'],
  ['representative', 'representative', 'Representative Demo'],
];

async function seed() {
  await db.init();

  const orgId = DEFAULT_ORG_ID || (await db.get('SELECT id FROM organizations ORDER BY id LIMIT 1'))?.id;
  if (!orgId) {
    console.log('No organization found. Run seed-uhpcms.js first.');
    process.exit(1);
  }

  const hash = await bcrypt.hash('admin123', 10);

  for (const [roleName, emailLocal, fullName] of ORG_ROLES) {
    const rId = `role_${roleName}_${orgId}`;
    await db.run(
      'INSERT OR IGNORE INTO roles (id, name, org_id) VALUES ($1, $2, $3)',
      [rId, roleName, orgId]
    ).catch(() => {});
    const email = `${emailLocal}@demo.local`;
    const uid = orgId === 'org_demo1' ? `u_${emailLocal}_demo` : `u_${emailLocal}_${orgId}`.replace(/[^a-z0-9_]/gi, '_');
    try {
      await db.run(
        'INSERT OR IGNORE INTO system_users (id, org_id, email, password_hash, role_id, full_name, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [uid, orgId, email, hash, rId, fullName, 'active']
      );
      console.log('Added (or existed):', email);
    } catch (e) {
      if (e.message && e.message.includes('UNIQUE')) console.log('Exists:', email);
      else console.error(email, e.message);
    }
  }

  console.log('');
  console.log('Portal users for org', orgId, '(password: admin123)');
  console.log('  doctor@demo.local, nurse@demo.local, accountant@demo.local, receptionist@demo.local, pharmacist@demo.local, representative@demo.local');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
