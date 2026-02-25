const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/stats - users_in_system: doctors count, patients count, employees count, total OPD income
router.get('/', async (req, res) => {
  try {
    const doctors = await db.get(
      'SELECT COUNT(*) AS count FROM employee WHERE role = $1 AND status = $2',
      ['doctor', 1]
    );
    const patients = await db.get('SELECT COUNT(*) AS count FROM patient');
    const employees = await db.get('SELECT COUNT(*) AS count FROM employee WHERE status = $1', [1]);
    const income = await db.get(
      "SELECT COALESCE(SUM(CAST(fees AS REAL)), 0) AS total FROM opddetails"
    );
    res.json({
      ok: true,
      data: {
        doctors: Number(doctors?.count ?? 0),
        patients: Number(patients?.count ?? 0),
        employees: Number(employees?.count ?? 0),
        total_opd_income: Number(income?.total ?? 0),
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
