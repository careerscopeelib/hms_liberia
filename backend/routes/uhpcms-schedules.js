const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireOrgActive } = require('../middleware/orgCheck');
const ids = require('../lib/ids');

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
    const { doctor_id } = req.query;
    let sql = 'SELECT id, org_id, doctor_id, department_id, day_of_week, start_time, end_time, created_at FROM doctor_schedules WHERE org_id = $1';
    const params = [orgId];
    if (doctor_id) { params.push(doctor_id); sql += ` AND doctor_id = $${params.length}`; }
    sql += ' ORDER BY doctor_id, day_of_week, start_time';
    const rows = await db.query(sql, params);
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    res.json({ ok: true, data: rows, days: DAYS });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post('/', orgContext, async (req, res) => {
  try {
    const { doctor_id, department_id, day_of_week, start_time, end_time } = req.body || {};
    if (doctor_id == null || day_of_week == null || !start_time || !end_time) {
      return res.status(400).json({ ok: false, message: 'doctor_id, day_of_week, start_time, end_time required' });
    }
    const orgId = req.orgId || req.body.org_id;
    const id = await ids.getNextPrefixedId('doctor_schedules', 'id', 'SCHED-', 'org_id', orgId);
    await db.run(
      'INSERT INTO doctor_schedules (id, org_id, doctor_id, department_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, orgId, doctor_id, department_id || null, parseInt(day_of_week, 10), start_time, end_time]
    );
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM doctor_schedules WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
