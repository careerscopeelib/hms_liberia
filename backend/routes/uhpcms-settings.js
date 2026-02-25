const express = require('express');
const db = require('../db');
const config = require('../config');

const router = express.Router();

// GET /api/uhpcms/settings - currency (USD/LRD rate), system name
router.get('/', async (req, res) => {
  try {
    let lrdPerUsd = config.currency.lrdPerUsd;
    try {
      const row = await db.get("SELECT value FROM system_settings WHERE key = $1", ['lrd_per_usd']);
      if (row?.value) lrdPerUsd = parseFloat(row.value);
    } catch (_) {}
    res.json({
      ok: true,
      currency: {
        default: config.currency.default,
        lrdPerUsd,
        options: ['USD', 'LRD'],
      },
      systemName: 'U-HPCMS',
    });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
