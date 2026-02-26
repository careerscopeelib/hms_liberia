const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { requireOrgActive } = require('../middleware/orgCheck');
const crypto = require('crypto');

const router = express.Router();
router.use(requireAuth);
router.use(requireOrgActive);

const orgContext = (req, res, next) => {
  const orgId = req.user?.org_id || req.query.org_id || req.body?.org_id;
  if (!orgId && req.user?.role !== 'super_admin') return res.status(400).json({ ok: false, message: 'org_id required' });
  req.orgId = orgId;
  next();
};

// ---------- Roles (for user creation dropdown) ----------
const DEFAULT_ORG_ROLES = [
  ['org_admin', (id) => `role_org_admin_${id}`],
  ['doctor', (id) => `role_doctor_${id}`],
  ['nurse', (id) => `role_nurse_${id}`],
  ['accountant', (id) => `role_accountant_${id}`],
  ['receptionist', (id) => `role_receptionist_${id}`],
  ['pharmacist', (id) => `role_pharmacist_${id}`],
  ['representative', (id) => `role_representative_${id}`],
];

router.get('/roles', async (req, res) => {
  try {
    const orgId = req.query.org_id || req.user?.org_id;
    const normalizedOrgId = orgId && String(orgId).trim() ? orgId : null;
    if (normalizedOrgId) {
      for (const [name, idFn] of DEFAULT_ORG_ROLES) {
        const roleId = idFn(normalizedOrgId);
        const exists = await db.get('SELECT id FROM roles WHERE id = $1', [roleId]);
        if (!exists) {
          await db.run('INSERT INTO roles (id, name, org_id) VALUES ($1, $2, $3)', [roleId, name, normalizedOrgId]);
        }
      }
    }
    const sql = normalizedOrgId
      ? 'SELECT id, name FROM roles WHERE org_id = $1 ORDER BY name'
      : 'SELECT id, name FROM roles WHERE org_id IS NULL ORDER BY name';
    const params = normalizedOrgId ? [normalizedOrgId] : [];
    const rows = await db.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// ---------- Departments ----------
router.get('/departments', orgContext, audit('org_admin', 'list_departments'), async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const rows = await db.query('SELECT id, org_id, name, created_at FROM departments WHERE org_id = $1 ORDER BY name', [orgId]);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post('/departments', orgContext, audit('org_admin', 'create_department'), async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, message: 'name required' });
    const orgId = req.orgId || req.body.org_id;
    const id = 'dept_' + crypto.randomBytes(6).toString('hex');
    await db.run('INSERT INTO departments (id, org_id, name) VALUES ($1, $2, $3)', [id, orgId, name]);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// ---------- Wards ----------
router.get('/wards', orgContext, audit('org_admin', 'list_wards'), async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const rows = await db.query('SELECT id, org_id, name, bed_count, created_at FROM wards WHERE org_id = $1 ORDER BY name', [orgId]);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post('/wards', orgContext, audit('org_admin', 'create_ward'), async (req, res) => {
  try {
    const { name, bed_count } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, message: 'name required' });
    const orgId = req.orgId || req.body.org_id;
    const id = 'ward_' + crypto.randomBytes(6).toString('hex');
    await db.run('INSERT INTO wards (id, org_id, name, bed_count) VALUES ($1, $2, $3, $4)', [id, orgId, name, bed_count || 0]);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// ---------- Pharmacy stores ----------
router.get('/pharmacy-stores', orgContext, audit('org_admin', 'list_stores'), async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const rows = await db.query('SELECT id, org_id, name, created_at FROM pharmacy_stores WHERE org_id = $1 ORDER BY name', [orgId]);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post('/pharmacy-stores', orgContext, audit('org_admin', 'create_store'), async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, message: 'name required' });
    const orgId = req.orgId || req.body.org_id;
    const id = 'store_' + crypto.randomBytes(6).toString('hex');
    await db.run('INSERT INTO pharmacy_stores (id, org_id, name) VALUES ($1, $2, $3)', [id, orgId, name]);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// ---------- Services (billing codes) ----------
router.get('/services', orgContext, audit('org_admin', 'list_services'), async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const rows = await db.query('SELECT id, org_id, code, name, default_amount, default_currency, created_at FROM services WHERE org_id = $1 ORDER BY code', [orgId]);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post('/services', orgContext, audit('org_admin', 'create_service'), async (req, res) => {
  try {
    const { code, name, default_amount, default_currency } = req.body || {};
    if (!code || !name) return res.status(400).json({ ok: false, message: 'code and name required' });
    const orgId = req.orgId || req.body.org_id;
    const id = 'svc_' + crypto.randomBytes(6).toString('hex');
    await db.run(
      'INSERT INTO services (id, org_id, code, name, default_amount, default_currency) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, orgId, code, name, default_amount != null ? Number(default_amount) : null, default_currency || 'USD']
    );
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// ---------- Users (org-level) ----------
router.get('/users', orgContext, audit('org_admin', 'list_users'), async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const rows = await db.query(
      'SELECT u.id, u.org_id, u.email, u.role_id, u.department_id, u.full_name, u.status, u.created_at FROM system_users u WHERE u.org_id = $1 ORDER BY u.email',
      [orgId]
    );
    res.json({ ok: true, data: rows });
  } catch (e) {
    if (e.code === '42P01' || e.message?.includes('does not exist') || e.message?.includes('no such table')) {
      return res.json({ ok: true, data: [] });
    }
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post('/users', orgContext, audit('org_admin', 'create_user'), async (req, res) => {
  try {
    const { email, password, role_id, department_id, full_name } = req.body || {};
    if (!email || !password) return res.status(400).json({ ok: false, message: 'email and password required' });
    const orgId = req.orgId || req.body.org_id;
    const defaultRoleId = `role_org_admin_${orgId}`;
    const id = 'usr_' + crypto.randomBytes(8).toString('hex');
    const hash = await bcrypt.hash(password, 10);
    await db.run(
      'INSERT INTO system_users (id, org_id, email, password_hash, role_id, department_id, full_name, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, orgId, email, hash, role_id || defaultRoleId, department_id || null, full_name || null, 'active']
    );
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
