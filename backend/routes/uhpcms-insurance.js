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
    const { patient_mrn, status } = req.query;
    let sql = 'SELECT id, org_id, patient_mrn, provider_name, policy_number, coverage_details, status, created_at FROM insurance_policies WHERE org_id = $1';
    const params = [orgId];
    if (patient_mrn) { params.push(patient_mrn); sql += ` AND patient_mrn = $${params.length}`; }
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
    const { patient_mrn, provider_name, policy_number, coverage_details } = req.body || {};
    if (!provider_name) return res.status(400).json({ ok: false, message: 'provider_name required' });
    const orgId = req.orgId || req.body.org_id;
    const id = await ids.getNextInsuranceId(orgId);
    await db.run(
      'INSERT INTO insurance_policies (id, org_id, patient_mrn, provider_name, policy_number, coverage_details, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, orgId, patient_mrn || null, provider_name, policy_number || null, coverage_details || null, 'active']
    );
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { provider_name, policy_number, coverage_details, status } = req.body || {};
    const updates = [];
    const params = [];
    let n = 1;
    if (provider_name !== undefined) { params.push(provider_name); updates.push(`provider_name = $${n++}`); }
    if (policy_number !== undefined) { params.push(policy_number); updates.push(`policy_number = $${n++}`); }
    if (coverage_details !== undefined) { params.push(coverage_details); updates.push(`coverage_details = $${n++}`); }
    if (status !== undefined) { params.push(status); updates.push(`status = $${n++}`); }
    if (updates.length === 0) return res.status(400).json({ ok: false, message: 'Nothing to update' });
    params.push(id);
    await db.run(`UPDATE insurance_policies SET ${updates.join(', ')} WHERE id = $${n}`, params);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM insurance_policies WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
