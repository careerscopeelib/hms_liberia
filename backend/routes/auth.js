const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const config = require('../config');

const router = express.Router();
const isPg = config.dbType === 'postgres';

// POST /api/auth/login - body: { role, username, password }
router.post('/login', async (req, res) => {
  try {
    const { role, username, password } = req.body || {};
    if (!role || !username || !password) {
      return res.status(400).json({ ok: false, message: 'role, username and password required' });
    }
    const row = await db.get(
      isPg
        ? 'SELECT id, role, username, password FROM login WHERE role = $1 AND username = $2'
        : 'SELECT id, role, username, password FROM login WHERE role = $1 AND username = $2',
      [role, username]
    );
    if (!row || !row.password) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, row.password);
    if (!valid) return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    res.json({ ok: true, id: row.id, role: row.role, username: row.username });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
