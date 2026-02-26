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

router.get('/', async (req, res) => {
  try {
    const { ward_id } = req.query;
    let sql = 'SELECT b.id, b.ward_id, b.bed_number, b.status, b.created_at, w.name as ward_name FROM beds b JOIN wards w ON w.id = b.ward_id WHERE 1=1';
    const params = [];
    const orgId = req.user?.org_id || req.query.org_id;
    if (orgId) { params.push(orgId); sql += ` AND w.org_id = $${params.length}`; }
    if (ward_id) { params.push(ward_id); sql += ` AND b.ward_id = $${params.length}`; }
    sql += ' ORDER BY w.name, b.bed_number';
    const rows = await db.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post('/', orgContext, async (req, res) => {
  try {
    const { ward_id, bed_number } = req.body || {};
    if (!ward_id || !bed_number) return res.status(400).json({ ok: false, message: 'ward_id and bed_number required' });
    const id = await ids.getNextPrefixedId('beds', 'id', 'BED-', null, null);
    await db.run(
      'INSERT INTO beds (id, ward_id, bed_number, status) VALUES ($1, $2, $3, $4)',
      [id, ward_id, bed_number, 'available']
    );
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ ok: false, message: 'status required' });
    await db.run('UPDATE beds SET status = $1 WHERE id = $2', [status, id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM beds WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.get('/assignments', async (req, res) => {
  try {
    const orgId = req.user?.org_id || req.query.org_id;
    const sql = `SELECT a.id as admission_id, a.encounter_id, a.ward_id, a.bed, a.admitted_at, a.discharged_at, w.name as ward_name
      FROM admissions a JOIN wards w ON w.id = a.ward_id WHERE w.org_id = $1 AND a.discharged_at IS NULL ORDER BY a.admitted_at DESC`;
    const rows = await db.query(sql, [orgId]);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
