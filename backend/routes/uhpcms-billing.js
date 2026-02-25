const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireModule } = require('../middleware/requireModule');
const { requireOrgActive } = require('../middleware/orgCheck');
const crypto = require('crypto');

const router = express.Router();

router.use(requireAuth);
router.use(requireOrgActive);
router.use(requireModule('billing'));

// GET /api/uhpcms/billing/charges?encounter_id=
router.get('/charges', async (req, res) => {
  try {
    const { encounter_id } = req.query;
    if (!encounter_id) return res.status(400).json({ ok: false, message: 'encounter_id required' });
    const rows = await db.query(
      'SELECT id, encounter_id, service_code, description, amount, currency, quantity, created_at FROM billing_charges WHERE encounter_id = $1 ORDER BY created_at',
      [encounter_id]
    );
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/uhpcms/billing/charges - add charge (USD or LRD)
router.post('/charges', async (req, res) => {
  try {
    const { encounter_id, service_code, description, amount, currency, quantity } = req.body || {};
    if (!encounter_id || !service_code || amount == null) {
      return res.status(400).json({ ok: false, message: 'encounter_id, service_code, amount required' });
    }
    const curr = (currency || 'USD').toUpperCase();
    if (curr !== 'USD' && curr !== 'LRD') return res.status(400).json({ ok: false, message: 'currency must be USD or LRD' });
    const id = 'ch_' + crypto.randomBytes(8).toString('hex');
    await db.run(
      'INSERT INTO billing_charges (id, encounter_id, service_code, description, amount, currency, quantity) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, encounter_id, service_code, description || null, Number(amount), curr, quantity ?? 1]
    );
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/uhpcms/billing/invoices?encounter_id=
router.get('/invoices', async (req, res) => {
  try {
    const { encounter_id } = req.query;
    if (!encounter_id) return res.status(400).json({ ok: false, message: 'encounter_id required' });
    const rows = await db.query(
      'SELECT id, encounter_id, total_amount, currency, status, created_at, paid_at FROM invoices WHERE encounter_id = $1 ORDER BY created_at',
      [encounter_id]
    );
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/uhpcms/billing/invoices - create invoice from charges (USD or LRD)
router.post('/invoices', async (req, res) => {
  try {
    const { encounter_id, currency } = req.body || {};
    if (!encounter_id) return res.status(400).json({ ok: false, message: 'encounter_id required' });
    const curr = (currency || 'USD').toUpperCase();
    if (curr !== 'USD' && curr !== 'LRD') return res.status(400).json({ ok: false, message: 'currency must be USD or LRD' });
    const charges = await db.query(
      'SELECT amount, quantity FROM billing_charges WHERE encounter_id = $1',
      [encounter_id]
    );
    const total = charges.reduce((s, c) => s + (c.amount || 0) * (c.quantity || 1), 0);
    const id = 'inv_' + crypto.randomBytes(8).toString('hex');
    await db.run(
      'INSERT INTO invoices (id, encounter_id, total_amount, currency, status) VALUES ($1, $2, $3, $4, $5)',
      [id, encounter_id, total, curr, 'pending']
    );
    res.status(201).json({ ok: true, id, total_amount: total, currency: curr });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/uhpcms/billing/payments - record payment (USD or LRD)
router.post('/payments', async (req, res) => {
  try {
    const { invoice_id, amount, currency, method, reference } = req.body || {};
    if (!invoice_id || amount == null) return res.status(400).json({ ok: false, message: 'invoice_id and amount required' });
    const curr = (currency || 'USD').toUpperCase();
    if (curr !== 'USD' && curr !== 'LRD') return res.status(400).json({ ok: false, message: 'currency must be USD or LRD' });
    const id = 'pay_' + crypto.randomBytes(8).toString('hex');
    await db.run(
      'INSERT INTO payments (id, invoice_id, amount, currency, method, reference) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, invoice_id, Number(amount), curr, method || 'cash', reference || null]
    );
    const payments = await db.query('SELECT SUM(amount) as total FROM payments WHERE invoice_id = $1', [invoice_id]);
    const inv = await db.get('SELECT total_amount FROM invoices WHERE id = $1', [invoice_id]);
    const paid = (payments[0]?.total || 0);
    const status = paid >= (inv?.total_amount || 0) ? 'paid' : 'partial';
    await db.run(
      'UPDATE invoices SET status = $1, paid_at = CASE WHEN $1 = $2 THEN datetime($3) ELSE paid_at END WHERE id = $4',
      [status, 'paid', 'now', invoice_id]
    );
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
