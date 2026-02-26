const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireOrgActive } = require('../middleware/orgCheck');

const router = express.Router();
router.use(requireAuth);
router.use(requireOrgActive);

function orgContext(req, res, next) {
  const orgId = req.user?.org_id || req.query.org_id || req.body?.org_id;
  if (!orgId && req.user?.role !== 'super_admin') return res.status(400).json({ ok: false, message: 'org_id required' });
  req.orgId = orgId;
  next();
}

router.get('/', orgContext, async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const { user_id, activity_type, limit } = req.query;
    let sql = 'SELECT id, org_id, user_id, activity_type, entity_type, entity_id, details, created_at FROM hospital_activities WHERE org_id = $1';
    const params = [orgId];
    if (user_id) { params.push(user_id); sql += ` AND user_id = $${params.length}`; }
    if (activity_type) { params.push(activity_type); sql += ` AND activity_type = $${params.length}`; }
    sql += ' ORDER BY created_at DESC';
    const lim = Math.min(parseInt(limit, 10) || 100, 500);
    sql += ` LIMIT ${lim}`;
    const rows = await db.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post('/', orgContext, async (req, res) => {
  try {
    const { activity_type, entity_type, entity_id, details } = req.body || {};
    if (!activity_type) return res.status(400).json({ ok: false, message: 'activity_type required' });
    const orgId = req.orgId || req.body.org_id;
    await db.run(
      'INSERT INTO hospital_activities (org_id, user_id, activity_type, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
      [orgId, req.user?.id || null, activity_type, entity_type || null, entity_id || null, details ? JSON.stringify(details) : null]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
