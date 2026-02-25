const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', requireRole('super_admin', 'org_admin'), async (req, res) => {
  try {
    const { org_id, module, limit } = req.query;
    let sql = 'SELECT id, user_id, org_id, module, action, payload, created_at FROM audit_log WHERE 1=1';
    const params = [];
    if (org_id) { params.push(org_id); sql += ` AND org_id = $${params.length}`; }
    if (module) { params.push(module); sql += ` AND module = $${params.length}`; }
    sql += ' ORDER BY created_at DESC LIMIT ' + Math.min(parseInt(limit, 10) || 100, 500);
    const rows = await db.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
