const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const ids = require('../lib/ids');

const router = express.Router();

const MODULES = ['hospital', 'clinic', 'pharmacy', 'lab', 'billing', 'pharmacy_inventory', 'hr', 'reporting'];

// All governance routes require auth; super_admin only for create/assign
router.use(requireAuth);

// GET /api/uhpcms/governance/organizations - list organizations (super_admin or org_admin for own)
router.get('/organizations', async (req, res) => {
  try {
    const isSuper = req.user.role === 'super_admin';
    let rows;
    if (isSuper) {
      rows = await db.query('SELECT id, name, type, status, subscription_plan, created_at FROM organizations ORDER BY created_at DESC');
    } else if (req.user.org_id) {
      rows = await db.query('SELECT id, name, type, status, subscription_plan, created_at FROM organizations WHERE id = $1', [req.user.org_id]);
    } else {
      rows = [];
    }
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/uhpcms/governance/organizations - create organization (super_admin)
router.post('/organizations', requireRole('super_admin'), async (req, res) => {
  try {
    const { name, type, subscription_plan } = req.body || {};
    if (!name || !type) return res.status(400).json({ ok: false, message: 'name and type required' });
    if (!['hospital', 'clinic', 'pharmacy'].includes(type)) {
      return res.status(400).json({ ok: false, message: 'type must be hospital, clinic, or pharmacy' });
    }
    const id = await ids.getNextOrganizationId();
    await db.run(
      'INSERT INTO organizations (id, name, type, status, subscription_plan) VALUES ($1, $2, $3, $4, $5)',
      [id, name, type, 'active', subscription_plan || 'standard']
    );
    const roleOrgAdminId = 'role_org_admin_' + id;
    await db.run(
      'INSERT INTO roles (id, name, org_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
      [roleOrgAdminId, 'org_admin', id]
    );
    const defaultRoles = [
      ['role_doctor_' + id, 'doctor', id],
      ['role_nurse_' + id, 'nurse', id],
      ['role_receptionist_' + id, 'receptionist', id],
      ['role_pharmacist_' + id, 'pharmacist', id],
      ['role_accountant_' + id, 'accountant', id],
      ['role_representative_' + id, 'representative', id],
    ];
    for (const [rid, name, orgId] of defaultRoles) {
      await db.run('INSERT INTO roles (id, name, org_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING', [rid, name, orgId]);
    }
    for (const mod of MODULES) {
      await db.run(
        'INSERT INTO org_modules (org_id, module_name, enabled) VALUES ($1, $2, $3) ON CONFLICT (org_id, module_name) DO NOTHING',
        [id, mod, mod === type || mod === 'billing' ? 1 : 0]
      );
    }
    res.status(201).json({ ok: true, id, name, type });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PATCH /api/uhpcms/governance/organizations/:id - suspend/activate (super_admin)
router.patch('/organizations/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!['active', 'suspended'].includes(status)) return res.status(400).json({ ok: false, message: 'status must be active or suspended' });
    await db.run('UPDATE organizations SET status = $1 WHERE id = $2', [status, id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/uhpcms/governance/organizations/:id - single organization (super_admin or own org)
router.get('/organizations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isSuper = req.user.role === 'super_admin';
    if (!isSuper && req.user.org_id !== id) {
      return res.status(403).json({ ok: false, message: 'Insufficient permissions' });
    }
    const row = await db.get(
      'SELECT id, name, type, status, subscription_plan, created_at, settings FROM organizations WHERE id = $1',
      [id]
    );
    if (!row) return res.status(404).json({ ok: false, message: 'Organization not found' });
    res.json({ ok: true, data: row });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PUT /api/uhpcms/governance/organizations/:id - full update (super_admin only)
router.put('/organizations/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, subscription_plan, status } = req.body || {};
    const existing = await db.get('SELECT id FROM organizations WHERE id = $1', [id]);
    if (!existing) return res.status(404).json({ ok: false, message: 'Organization not found' });
    if (name != null) await db.run('UPDATE organizations SET name = $1 WHERE id = $2', [name, id]);
    if (type != null && ['hospital', 'clinic', 'pharmacy'].includes(type)) {
      await db.run('UPDATE organizations SET type = $1 WHERE id = $2', [type, id]);
    }
    if (subscription_plan != null) await db.run('UPDATE organizations SET subscription_plan = $1 WHERE id = $2', [subscription_plan, id]);
    if (status != null && ['active', 'suspended'].includes(status)) {
      await db.run('UPDATE organizations SET status = $1 WHERE id = $2', [status, id]);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// DELETE /api/uhpcms/governance/organizations/:id (super_admin only)
router.delete('/organizations/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.get('SELECT id FROM organizations WHERE id = $1', [id]);
    if (!existing) return res.status(404).json({ ok: false, message: 'Organization not found' });
    const userCount = await db.get('SELECT COUNT(*) as c FROM system_users WHERE org_id = $1', [id]);
    if (userCount?.c > 0) {
      return res.status(400).json({ ok: false, message: 'Cannot delete organization with users. Remove or reassign users first.' });
    }
    await db.run('DELETE FROM org_addons WHERE org_id = $1', [id]);
    await db.run('DELETE FROM org_modules WHERE org_id = $1', [id]);
    await db.run('DELETE FROM roles WHERE org_id = $1', [id]);
    await db.run('DELETE FROM organizations WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/uhpcms/governance/organizations/:id/modules
router.get('/organizations/:id/modules', async (req, res) => {
  try {
    const rows = await db.query('SELECT module_name, enabled FROM org_modules WHERE org_id = $1', [req.params.id]);
    res.json({ ok: true, data: rows });
  } catch (e) {
    if (e.code === '42P01' || e.message?.includes('does not exist') || e.message?.includes('no such table')) {
      return res.json({ ok: true, data: [] });
    }
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PUT /api/uhpcms/governance/organizations/:id/modules - enable/disable modules (super_admin)
router.put('/organizations/:id/modules', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { modules } = req.body || {};
    if (!Array.isArray(modules)) return res.status(400).json({ ok: false, message: 'modules array required' });
    for (const { name, enabled } of modules) {
      await db.run(
        'INSERT INTO org_modules (org_id, module_name, enabled) VALUES ($1, $2, $3) ON CONFLICT(org_id, module_name) DO UPDATE SET enabled = $3',
        [id, name, enabled ? 1 : 0]
      );
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/uhpcms/governance/organizations/:id/addons
router.get('/organizations/:id/addons', async (req, res) => {
  try {
    const rows = await db.query('SELECT addon_name, enabled FROM org_addons WHERE org_id = $1', [req.params.id]);
    res.json({ ok: true, data: rows });
  } catch (e) {
    if (e.code === '42P01' || e.message?.includes('does not exist') || e.message?.includes('no such table')) {
      return res.json({ ok: true, data: [] });
    }
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PUT /api/uhpcms/governance/organizations/:id/addons - enable/disable add-ons (super_admin)
router.put('/organizations/:id/addons', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { addons } = req.body || {};
    if (!Array.isArray(addons)) return res.status(400).json({ ok: false, message: 'addons array required' });
    for (const { name, enabled } of addons) {
      await db.run(
        'INSERT INTO org_addons (org_id, addon_name, enabled) VALUES ($1, $2, $3) ON CONFLICT(org_id, addon_name) DO UPDATE SET enabled = $3',
        [id, name, enabled ? 1 : 0]
      );
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// ---------- Governance users (super_admin: list/edit/delete any org user) ----------
// GET /api/uhpcms/governance/users - list users, optional org_id filter
router.get('/users', requireRole('super_admin'), async (req, res) => {
  try {
    const orgId = req.query.org_id && String(req.query.org_id).trim() ? req.query.org_id.trim() : null;
    let rows;
    if (orgId) {
      rows = await db.query(
        'SELECT u.id, u.org_id, u.email, u.role_id, u.full_name, u.status, u.created_at, r.name as role_name FROM system_users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.org_id = $1 ORDER BY u.email',
        [orgId]
      );
    } else {
      rows = await db.query(
        'SELECT u.id, u.org_id, u.email, u.role_id, u.full_name, u.status, u.created_at, r.name as role_name FROM system_users u LEFT JOIN roles r ON r.id = u.role_id ORDER BY u.org_id, u.email'
      );
    }
    res.json({ ok: true, data: rows });
  } catch (e) {
    if (e.code === '42P01' || e.message?.includes('does not exist') || e.message?.includes('no such table')) {
      return res.json({ ok: true, data: [] });
    }
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/uhpcms/governance/users/:id
router.get('/users/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const row = await db.get(
      'SELECT u.id, u.org_id, u.email, u.role_id, u.department_id, u.full_name, u.status, u.created_at FROM system_users u WHERE u.id = $1',
      [req.params.id]
    );
    if (!row) return res.status(404).json({ ok: false, message: 'User not found' });
    res.json({ ok: true, data: row });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PATCH /api/uhpcms/governance/users/:id
router.patch('/users/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name, role_id, status, password } = req.body || {};
    const existing = await db.get('SELECT id, org_id FROM system_users WHERE id = $1', [id]);
    if (!existing) return res.status(404).json({ ok: false, message: 'User not found' });
    if (email != null) await db.run('UPDATE system_users SET email = $1 WHERE id = $2', [email.trim(), id]);
    if (full_name != null) await db.run('UPDATE system_users SET full_name = $1 WHERE id = $2', [full_name || null, id]);
    if (role_id != null) await db.run('UPDATE system_users SET role_id = $1 WHERE id = $2', [role_id, id]);
    if (status != null && ['active', 'inactive', 'suspended'].includes(status)) {
      await db.run('UPDATE system_users SET status = $1 WHERE id = $2', [status, id]);
    }
    if (password != null && String(password).length >= 6) {
      const hash = await bcrypt.hash(password, 10);
      await db.run('UPDATE system_users SET password_hash = $1 WHERE id = $2', [hash, id]);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// DELETE /api/uhpcms/governance/users/:id (super_admin only; sets inactive to avoid breaking references, or hard delete)
router.delete('/users/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.get('SELECT id FROM system_users WHERE id = $1', [id]);
    if (!existing) return res.status(404).json({ ok: false, message: 'User not found' });
    await db.run('UPDATE system_users SET status = $1 WHERE id = $2', ['inactive', id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
