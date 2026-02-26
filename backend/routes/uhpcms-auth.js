const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');

const router = express.Router();

function deriveRoleName(roleId) {
  if (!roleId || typeof roleId !== 'string') return roleId;
  const s = roleId.replace(/^role_/, '');
  return s.replace(/_org_[a-zA-Z0-9_]+$/, '') || s || roleId;
}

// POST /api/uhpcms/auth/login - body: { email, password } or legacy { role, username, password }
// Returns JWT and user context (org, role, permissions)
router.post('/login', async (req, res) => {
  try {
    const { email, password, role, username } = req.body || {};
    let userRow = null;
    let isLegacy = false;

    if (email && password) {
      userRow = await db.get(
        'SELECT id, org_id, email, password_hash, role_id, full_name, status FROM system_users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND status = $2',
        [email, 'active']
      );
      if (userRow) {
        const valid = await bcrypt.compare(password, userRow.password_hash);
        if (!valid) return res.status(401).json({ ok: false, message: 'Invalid credentials' });
      }
    }

    if (!userRow && role && req.body.password) {
      isLegacy = true;
      const legacy = await db.get(
        'SELECT id, role, username, password FROM login WHERE role = $1 AND username = $2',
        [role, username]
      );
      if (!legacy || !legacy.password) return res.status(401).json({ ok: false, message: 'Invalid credentials' });
      const valid = await bcrypt.compare(req.body.password, legacy.password);
      if (!valid) return res.status(401).json({ ok: false, message: 'Invalid credentials' });
      userRow = { id: legacy.id, role: legacy.role, username: legacy.username, org_id: null, role_id: legacy.role };
    }

    if (!userRow) {
      try {
        db.run(
          'INSERT INTO audit_log (user_id, org_id, module, action, payload) VALUES ($1, $2, $3, $4, $5)',
          [null, null, 'auth', 'login_failed', JSON.stringify({ identifier: email || username || 'unknown' })]
        );
      } catch (_) {}
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }

    let orgActive = null;
    try {
      if (userRow.org_id) {
        orgActive = await db.get('SELECT status FROM organizations WHERE id = $1', [userRow.org_id]);
      }
    } catch (_) {}
    if (userRow.org_id && orgActive?.status === 'suspended') {
      try {
        db.run(
          'INSERT INTO audit_log (user_id, org_id, module, action, payload) VALUES ($1, $2, $3, $4, $5)',
          [userRow.id, userRow.org_id, 'auth', 'login_org_suspended', JSON.stringify({ email: userRow.email || userRow.username })]
        );
      } catch (_) {}
      return res.status(403).json({ ok: false, message: 'Organization is suspended' });
    }

    const roleId = userRow.role_id || userRow.role;
    let roleName = roleId;
    try {
      if (roleId && typeof roleId === 'string') {
        const roleRow = await db.get('SELECT name FROM roles WHERE id = $1', [roleId]);
        if (roleRow) roleName = roleRow.name;
        else roleName = deriveRoleName(roleId);
      }
    } catch (_) {
      if (roleId && typeof roleId === 'string') roleName = deriveRoleName(roleId);
    }
    const payload = {
      sub: userRow.id,
      role: roleName,
      org_id: userRow.org_id || null,
      email: userRow.email || userRow.username,
    };
    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

    try {
      db.run(
        'INSERT INTO audit_log (user_id, org_id, module, action, payload) VALUES ($1, $2, $3, $4, $5)',
        [userRow.id, userRow.org_id || null, 'auth', 'login_success', JSON.stringify({ email: userRow.email || userRow.username })]
      );
    } catch (_) {}

    let enabled_modules = null;
    let enabled_addons = null;
    if (userRow.org_id) {
      try {
        const modRows = await db.query('SELECT module_name FROM org_modules WHERE org_id = $1 AND enabled = 1', [userRow.org_id]);
        const addonRows = await db.query('SELECT addon_name FROM org_addons WHERE org_id = $1 AND enabled = 1', [userRow.org_id]);
        enabled_modules = modRows.map((r) => r.module_name);
        enabled_addons = addonRows.map((r) => r.addon_name);
      } catch (_) {
        enabled_modules = [];
        enabled_addons = [];
      }
    }

    res.json({
      ok: true,
      token,
      user: {
        id: userRow.id,
        role: roleName,
        org_id: userRow.org_id,
        email: userRow.email || userRow.username,
        username: userRow.username || userRow.email,
        full_name: userRow.full_name || userRow.username || userRow.email,
        enabled_modules,
        enabled_addons,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
