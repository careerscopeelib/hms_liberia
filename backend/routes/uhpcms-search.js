const express = require('express');
const db = require('../db');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
const { requireOrgActive } = require('../middleware/orgCheck');

const router = express.Router();
router.use(requireAuth);
router.use(requireOrgActive);

/** GET /api/uhpcms/search?q=...&org_id=...
 * Returns { patients, users, notices } for global header search.
 */
router.get('/', async (req, res) => {
  try {
    const orgId = req.user?.org_id || req.query.org_id;
    if (!orgId) return res.json({ ok: true, data: { patients: [], users: [], notices: [] } });

    const q = (req.query.q || '').trim();
    if (!q) return res.json({ ok: true, data: { patients: [], users: [], notices: [] } });

    const pattern = `%${q}%`;
    const patternLower = `%${q.toLowerCase()}%`;
    const dbType = config.dbType || 'sqlite';
    const isPg = dbType === 'postgres';
    const searchParam = isPg ? pattern : patternLower;
    const like = (col) => (isPg ? `${col} ILIKE $2` : `(LOWER(CAST(${col} AS TEXT)) LIKE $2)`);
    const params = [orgId, searchParam];

    const [patients, users, notices] = await Promise.all([
      db.query(
        `SELECT id, mrn, full_name, phone, org_id FROM patient_org WHERE org_id = $1 AND (${like('full_name')} OR ${like('mrn')} OR ${like('phone')}) ORDER BY full_name LIMIT 10`,
        params
      ),
      db.query(
        `SELECT id, email, full_name, role_id, org_id FROM system_users WHERE org_id = $1 AND status = 'active' AND (${like('full_name')} OR ${like('email')}) ORDER BY full_name, email LIMIT 10`,
        params
      ),
      db.query(
        `SELECT id, title, content, created_at, is_pinned FROM noticeboard WHERE org_id = $1 AND (${like('title')} OR ${like('content')}) ORDER BY is_pinned DESC, created_at DESC LIMIT 5`,
        params
      ),
    ]);

    res.json({
      ok: true,
      data: { patients: patients || [], users: users || [], notices: notices || [] },
    });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
