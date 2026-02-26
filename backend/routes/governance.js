const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const crypto = require('crypto');

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
    const id = 'org_' + crypto.randomBytes(8).toString('hex');
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

module.exports = router;
