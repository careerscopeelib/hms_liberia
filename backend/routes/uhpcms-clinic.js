const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireModule } = require('../middleware/requireModule');
const { audit } = require('../middleware/audit');
const { requireOrgActive } = require('../middleware/orgCheck');
const crypto = require('crypto');

const router = express.Router();
router.use(requireAuth);
router.use(requireOrgActive);
router.use(requireModule('clinic'));

router.get('/appointments', audit('clinic', 'list_appointments'), async (req, res) => {
  try {
    const { org_id, status, from_date, to_date } = req.query;
    let sql = 'SELECT id, org_id, patient_mrn, department_id, doctor_id, scheduled_at, status, encounter_id, created_at FROM appointments WHERE 1=1';
    const params = [];
    if (org_id) { params.push(org_id); sql += ` AND org_id = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
    if (from_date) { params.push(from_date); sql += ` AND date(scheduled_at) >= $${params.length}`; }
    if (to_date) { params.push(to_date); sql += ` AND date(scheduled_at) <= $${params.length}`; }
    sql += ' ORDER BY scheduled_at';
    const rows = await db.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post('/appointments', audit('clinic', 'create_appointment'), async (req, res) => {
  try {
    const { org_id, patient_mrn, department_id, doctor_id, scheduled_at } = req.body || {};
    if (!org_id || !patient_mrn || !scheduled_at) return res.status(400).json({ ok: false, message: 'org_id, patient_mrn, scheduled_at required' });
    const id = 'apt_' + crypto.randomBytes(8).toString('hex');
    await db.run(
      'INSERT INTO appointments (id, org_id, patient_mrn, department_id, doctor_id, scheduled_at, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, org_id, patient_mrn, department_id || null, doctor_id || null, scheduled_at, 'scheduled']
    );
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.patch('/appointments/:id/check-in', audit('clinic', 'check_in'), async (req, res) => {
  try {
    const { id } = req.params;
    const { encounter_id } = req.body || {};
    await db.run('UPDATE appointments SET status = $1, encounter_id = $2 WHERE id = $3', ['checked_in', encounter_id || null, id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.patch('/appointments/:id/complete', audit('clinic', 'complete_appointment'), async (req, res) => {
  try {
    await db.run('UPDATE appointments SET status = $1 WHERE id = $2', ['completed', req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
