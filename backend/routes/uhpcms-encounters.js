const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireModule } = require('../middleware/requireModule');
const crypto = require('crypto');

const router = express.Router();

router.use(requireAuth);
router.use(requireModule(['hospital', 'clinic']));

// GET /api/uhpcms/encounters?org_id=&status=
router.get('/', async (req, res) => {
  try {
    const { org_id, status } = req.query;
    let sql = 'SELECT id, org_id, patient_mrn, department_id, doctor_id, status, registered_at, closed_at, referral_notes FROM encounters WHERE 1=1';
    const params = [];
    if (org_id) { params.push(org_id); sql += ` AND org_id = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
    sql += ' ORDER BY registered_at DESC';
    const rows = await db.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/uhpcms/encounters/:id - single encounter (e.g. for referral_notes / detail)
router.get('/:id', async (req, res) => {
  try {
    const row = await db.get(
      'SELECT id, org_id, patient_mrn, department_id, doctor_id, status, registered_at, closed_at, triage_notes, soap_notes, referral_notes FROM encounters WHERE id = $1',
      [req.params.id]
    );
    if (!row) return res.status(404).json({ ok: false, message: 'Encounter not found' });
    res.json({ ok: true, data: row });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/uhpcms/encounters - create encounter (patient registration flow)
router.post('/', async (req, res) => {
  try {
    const { org_id, patient_mrn, department_id, doctor_id } = req.body || {};
    if (!org_id || !patient_mrn) return res.status(400).json({ ok: false, message: 'org_id and patient_mrn required' });
    const id = 'enc_' + crypto.randomBytes(8).toString('hex');
    await db.run(
      'INSERT INTO encounters (id, org_id, patient_mrn, department_id, doctor_id, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, org_id, patient_mrn, department_id || null, doctor_id || null, 'registered']
    );
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PATCH /api/uhpcms/encounters/:id - update status (triage, consultation, discharged), soap_notes, referral_notes
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, triage_notes, soap_notes, referral_notes } = req.body || {};
    const updates = [];
    const params = [];
    let n = 0;
    if (status) { n++; params.push(status); updates.push(`status = $${n}`); }
    if (triage_notes !== undefined) { n++; params.push(triage_notes); updates.push(`triage_notes = $${n}`); }
    if (soap_notes !== undefined) { n++; params.push(soap_notes); updates.push(`soap_notes = $${n}`); }
    if (referral_notes !== undefined) { n++; params.push(referral_notes); updates.push(`referral_notes = $${n}`); }
    if (status === 'discharged') { updates.push('closed_at = datetime(\'now\')'); }
    if (!updates.length) return res.status(400).json({ ok: false, message: 'No updates provided' });
    n++; params.push(id);
    await db.run(`UPDATE encounters SET ${updates.join(', ')} WHERE id = $${n}`, params);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
