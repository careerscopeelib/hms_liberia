const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireModule } = require('../middleware/requireModule');
const { requireOrgActive } = require('../middleware/orgCheck');

const router = express.Router();
router.use(requireAuth);
router.use(requireOrgActive);
router.use(requireModule('reporting'));

router.get('/dashboard', async (req, res) => {
  try {
    const orgId = req.user?.org_id || req.query.org_id;
    const encSql = orgId ? 'SELECT COUNT(*) as c FROM encounters WHERE org_id = $1' : 'SELECT COUNT(*) as c FROM encounters';
    const encParams = orgId ? [orgId] : [];
    const encounters = await db.get(encSql, encParams);
    const activeEnc = orgId
      ? await db.get("SELECT COUNT(*) as c FROM encounters WHERE org_id = $1 AND status NOT IN ('discharged', 'cancelled')", [orgId])
      : await db.get("SELECT COUNT(*) as c FROM encounters WHERE status NOT IN ('discharged', 'cancelled')");
    const revenue = orgId
      ? await db.get("SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices i JOIN encounters e ON e.id = i.encounter_id WHERE e.org_id = $1 AND i.status = 'paid'", [orgId])
      : await db.get("SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE status = 'paid'");
    const pendingLab = await db.get("SELECT COUNT(*) as c FROM lab_orders WHERE status IN ('pending', 'sample_collected', 'processing')");
    const pendingRx = await db.get("SELECT COUNT(*) as c FROM prescriptions WHERE status = 'pending'");
    res.json({
      ok: true,
      data: {
        total_encounters: Number(encounters?.c ?? 0),
        active_encounters: Number(activeEnc?.c ?? 0),
        total_revenue: Number(revenue?.total ?? 0),
        pending_lab_orders: Number(pendingLab?.c ?? 0),
        pending_prescriptions: Number(pendingRx?.c ?? 0),
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.get('/bed-occupancy', async (req, res) => {
  try {
    const org_id = req.query.org_id;
    if (!org_id) return res.status(400).json({ ok: false, message: 'org_id required' });
    const rows = await db.query(
      'SELECT w.id, w.name, w.bed_count, (SELECT COUNT(*) FROM admissions a WHERE a.ward_id = w.id AND a.discharged_at IS NULL) as occupied FROM wards w WHERE w.org_id = $1',
      [org_id]
    );
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// Analytics for admin dashboard charts (last 7 days, by status)
router.get('/analytics', async (req, res) => {
  try {
    const orgId = req.user?.org_id || req.query.org_id;
    const encWhere = orgId ? ' WHERE org_id = $1' : '';
    const encParams = orgId ? [orgId] : [];

    const byStatusSql = `SELECT status, COUNT(*) as count FROM encounters${encWhere} GROUP BY status`;
    const byStatusRows = await db.query(byStatusSql, encParams);
    const encounters_by_status = byStatusRows.reduce((acc, r) => {
      acc[r.status] = Number(r.count);
      return acc;
    }, {});

    const dateFilter = orgId ? ' AND org_id = $1' : '';
    const dayParams = orgId ? [orgId] : [];
    const encountersByDaySql = `SELECT date(registered_at) as day, COUNT(*) as count FROM encounters WHERE date(registered_at) >= date('now', '-7 days')${dateFilter} GROUP BY date(registered_at) ORDER BY day`;
    const encountersByDayRows = await db.query(encountersByDaySql, dayParams);

    const revJoin = orgId ? ' JOIN encounters e ON e.id = i.encounter_id AND e.org_id = $1' : '';
    const revParam = orgId ? [orgId] : [];
    const revenueByDaySql = `SELECT date(COALESCE(i.paid_at, i.created_at)) as day, COALESCE(SUM(i.total_amount), 0) as total FROM invoices i${revJoin} WHERE i.status = 'paid' AND date(COALESCE(i.paid_at, i.created_at)) >= date('now', '-7 days') GROUP BY day ORDER BY day`;
    const revenueByDayRows = await db.query(revenueByDaySql, revParam);

    res.json({
      ok: true,
      data: {
        encounters_by_status: encounters_by_status,
        encounters_by_day: encountersByDayRows.map((r) => ({ day: r.day, count: Number(r.count) })),
        revenue_by_day: revenueByDayRows.map((r) => ({ day: r.day, total: Number(r.total) })),
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
