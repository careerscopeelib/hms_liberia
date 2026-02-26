const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireOrgActive } = require('../middleware/orgCheck');
const crypto = require('crypto');

const router = express.Router();
router.use(requireAuth);
router.use(requireOrgActive);

function orgContext(req, res, next) {
  const orgId = req.user?.org_id || req.query.org_id || req.body?.org_id;
  if (!orgId && req.user?.role !== 'super_admin') return res.status(400).json({ ok: false, message: 'org_id required' });
  req.orgId = orgId;
  next();
}

// GET list: ?org_id= & patient_mrn=
router.get('/', orgContext, async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const { patient_mrn } = req.query;
    let sql = 'SELECT id, org_id, patient_mrn, name, content_type, created_at, created_by FROM patient_documents WHERE org_id = $1';
    const params = [orgId];
    if (patient_mrn) { params.push(patient_mrn); sql += ' AND patient_mrn = $2'; }
    sql += ' ORDER BY created_at DESC';
    const rows = await db.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET one (for download / view)
router.get('/:id', async (req, res) => {
  try {
    const row = await db.get(
      'SELECT id, name, content_type, content, created_at FROM patient_documents WHERE id = $1',
      [req.params.id]
    );
    if (!row) return res.status(404).json({ ok: false, message: 'Document not found' });
    res.json({ ok: true, data: row });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST upload (body: org_id, patient_mrn, name, content_type, content base64)
router.post('/', orgContext, async (req, res) => {
  try {
    const { patient_mrn, name, content_type, content } = req.body || {};
    if (!patient_mrn || !name) return res.status(400).json({ ok: false, message: 'patient_mrn and name required' });
    const id = 'doc_' + crypto.randomBytes(8).toString('hex');
    const orgId = req.orgId || req.body.org_id;
    await db.run(
      'INSERT INTO patient_documents (id, org_id, patient_mrn, name, content_type, content, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, orgId, patient_mrn, name, content_type || 'application/octet-stream', content || null, req.user?.id || null]
    );
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM patient_documents WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
