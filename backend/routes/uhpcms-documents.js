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

// GET list: ?org_id= & patient_mrn=  OR  ?org_id= & entity_type= & entity_id=
router.get('/', orgContext, async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const { patient_mrn, entity_type, entity_id } = req.query;
    if (entity_type && entity_id) {
      let rows = [];
      try {
        rows = await db.query(
          'SELECT id, org_id, entity_type, entity_id, name, content_type, created_at, created_by FROM entity_documents WHERE org_id = $1 AND entity_type = $2 AND entity_id = $3 ORDER BY created_at DESC',
          [orgId, entity_type, entity_id]
        );
      } catch (e) {
        if (e.code !== '42P01' && !e.message?.includes('no such table')) throw e;
      }
      return res.json({ ok: true, data: rows });
    }
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

function getDocumentById(id) {
  if (id.startsWith('edoc_') || id.startsWith('EDOC-')) {
    return db.get('SELECT id, name, content_type, content, created_at FROM entity_documents WHERE id = $1', [id]);
  }
  return db.get('SELECT id, name, content_type, content, created_at FROM patient_documents WHERE id = $1', [id]);
}

function deleteDocumentById(id) {
  if (id.startsWith('edoc_') || id.startsWith('EDOC-')) {
    return db.run('DELETE FROM entity_documents WHERE id = $1', [id]);
  }
  return db.run('DELETE FROM patient_documents WHERE id = $1', [id]);
}

// GET download (binary with Content-Disposition) - must be before GET /:id
router.get('/:id/download', async (req, res) => {
  try {
    const row = await getDocumentById(req.params.id);
    if (!row) return res.status(404).json({ ok: false, message: 'Document not found' });
    const content = row.content;
    const contentType = row.content_type || 'application/octet-stream';
    const name = (row.name || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!content) {
      return res.status(404).json({ ok: false, message: 'Document has no content' });
    }
    const buf = Buffer.from(content, 'base64');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.send(buf);
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET one (for view / JSON)
router.get('/:id', async (req, res) => {
  try {
    const row = await getDocumentById(req.params.id);
    if (!row) return res.status(404).json({ ok: false, message: 'Document not found' });
    res.json({ ok: true, data: row });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST upload (body: org_id, patient_mrn, name, content_type, content base64) OR (entity_type, entity_id, name, content_type, content)
router.post('/', orgContext, async (req, res) => {
  try {
    const { patient_mrn, entity_type, entity_id, name, content_type, content } = req.body || {};
    const orgId = req.orgId || req.body.org_id;
    if (entity_type && entity_id && name) {
      const id = await ids.getNextEntityDocumentId();
      try {
        await db.run(
          'INSERT INTO entity_documents (id, org_id, entity_type, entity_id, name, content_type, content, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [id, orgId, entity_type, entity_id, name, content_type || 'application/octet-stream', content || null, req.user?.id || null]
        );
        return res.status(201).json({ ok: true, id });
      } catch (e) {
        if (e.code === '42P01' || e.message?.includes('no such table')) {
          return res.status(503).json({ ok: false, message: 'Entity documents not available. Run migration schema-uhpcms-entity-docs-*.sql' });
        }
        throw e;
      }
    }
    if (!patient_mrn || !name) return res.status(400).json({ ok: false, message: 'patient_mrn and name required, or entity_type, entity_id and name' });
    const id = await ids.getNextDocumentId();
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
    const id = req.params.id;
    if (id.startsWith('edoc_') || id.startsWith('EDOC-')) {
      await db.run('DELETE FROM entity_documents WHERE id = $1', [id]);
    } else {
      await db.run('DELETE FROM patient_documents WHERE id = $1', [id]);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
