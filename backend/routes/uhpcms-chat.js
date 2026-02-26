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

router.get('/rooms', orgContext, async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const userId = req.user?.id;
    let sql = `SELECT r.id, r.name, r.created_at,
      (SELECT COUNT(*) FROM chat_messages m WHERE m.room_id = r.id) as message_count
      FROM chat_rooms r WHERE r.org_id = $1`;
    const params = [orgId];
    const rows = await db.query(sql, params);
    const withParticipant = await Promise.all(rows.map(async (r) => {
      const part = await db.get('SELECT 1 FROM chat_room_participants WHERE room_id = $1 AND user_id = $2', [r.id, userId]);
      return { ...r, is_participant: !!part };
    }));
    res.json({ ok: true, data: withParticipant });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post('/rooms', orgContext, async (req, res) => {
  try {
    const { name } = req.body || {};
    const id = 'room_' + crypto.randomBytes(8).toString('hex');
    const orgId = req.orgId || req.body.org_id;
    await db.run('INSERT INTO chat_rooms (id, org_id, name) VALUES ($1, $2, $3)', [id, orgId, name || 'General']);
    await db.run('INSERT INTO chat_room_participants (room_id, user_id) VALUES ($1, $2)', [id, req.user?.id]);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post('/rooms/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    try {
      await db.run('INSERT INTO chat_room_participants (room_id, user_id) VALUES ($1, $2)', [roomId, req.user?.id]);
    } catch (err) {
      if (!err.message || (!err.message.includes('UNIQUE') && !err.message.includes('unique') && !err.message.includes('duplicate'))) throw err;
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.get('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const rows = await db.query(
      'SELECT id, room_id, sender_id, body, created_at FROM chat_messages WHERE room_id = $1 ORDER BY created_at DESC LIMIT $2',
      [roomId, limit]
    );
    res.json({ ok: true, data: rows.reverse() });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { body } = req.body || {};
    if (!body || !body.trim()) return res.status(400).json({ ok: false, message: 'body required' });
    const id = 'msg_' + crypto.randomBytes(12).toString('hex');
    await db.run(
      'INSERT INTO chat_messages (id, room_id, sender_id, body) VALUES ($1, $2, $3, $4)',
      [id, roomId, req.user?.id, body.trim()]
    );
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
