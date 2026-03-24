const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireOrgActive } = require('../middleware/orgCheck');
const { requireOrgContext } = require('../middleware/requireOrgContext');
const ids = require('../lib/ids');

const router = express.Router();
router.use(requireAuth);
router.use(requireOrgActive);

router.get('/', requireOrgContext, async (req, res) => {
  try {
    const orgId = req.orgId;
    const rows = await db.query(
      'SELECT id, org_id, title, content, created_by, is_pinned, created_at FROM noticeboard WHERE org_id = $1 ORDER BY is_pinned DESC, created_at DESC',
      [orgId]
    );
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post('/', requireOrgContext, async (req, res) => {
  try {
    const { title, content, is_pinned } = req.body || {};
    if (!title) return res.status(400).json({ ok: false, message: 'title required' });
    const orgId = req.orgId;
    const id = await ids.getNextNoticeId(orgId);
    await db.run(
      'INSERT INTO noticeboard (id, org_id, title, content, created_by, is_pinned) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, orgId, title, content || '', req.user?.id || null, is_pinned ? 1 : 0]
    );
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, is_pinned } = req.body || {};
    const updates = [];
    const params = [];
    let n = 1;
    if (title !== undefined) { params.push(title); updates.push(`title = $${n++}`); }
    if (content !== undefined) { params.push(content); updates.push(`content = $${n++}`); }
    if (is_pinned !== undefined) { params.push(is_pinned ? 1 : 0); updates.push(`is_pinned = $${n++}`); }
    if (updates.length === 0) return res.status(400).json({ ok: false, message: 'Nothing to update' });
    params.push(id);
    await db.run(`UPDATE noticeboard SET ${updates.join(', ')} WHERE id = $${n}`, params);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM noticeboard WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
