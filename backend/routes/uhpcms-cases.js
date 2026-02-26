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
    const { doctor_id, status } = req.query;
    let sql = 'SELECT id, org_id, patient_mrn, doctor_id, case_type, status, notes, created_at, closed_at FROM cases WHERE org_id = $1';
    const params = [orgId];
    if (doctor_id) { params.push(doctor_id); sql += ` AND doctor_id = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
    sql += ' ORDER BY created_at DESC';
    const rows = await db.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post('/', orgContext, async (req, res) => {
  try {
    const { patient_mrn, doctor_id, case_type, notes } = req.body || {};
    if (!patient_mrn) return res.status(400).json({ ok: false, message: 'patient_mrn required' });
    const orgId = req.orgId || req.body.org_id;
    const id = await ids.getNextCaseId(orgId);
    await db.run(
      'INSERT INTO cases (id, org_id, patient_mrn, doctor_id, case_type, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, orgId, patient_mrn, doctor_id || null, case_type || null, 'open', notes || null]
    );
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body || {};
    const updates = [];
    const params = [];
    let n = 1;
    if (status !== undefined) {
      params.push(status);
      updates.push(`status = $${n++}`);
      if (status === 'closed') {
        params.push(new Date().toISOString());
        updates.push(`closed_at = $${n++}`);
      }
    }
    if (notes !== undefined) { params.push(notes); updates.push(`notes = $${n++}`); }
    if (updates.length === 0) return res.status(400).json({ ok: false, message: 'Nothing to update' });
    params.push(id);
    await db.run(`UPDATE cases SET ${updates.join(', ')} WHERE id = $${n}`, params);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM cases WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
