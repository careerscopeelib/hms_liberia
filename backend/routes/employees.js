const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const config = require('../config');

const router = express.Router();

const empCols = '"joiningDate", eid, "firstName", "middleName", "lastName", birthdate, gender, "emailID", mobileno, "adharNo", country, state, city, "residentialAddress", "permanentAddress", role, qualification, specialization, status';
const empColsSqlite = 'joiningDate, eid, firstName, middleName, lastName, birthdate, gender, emailID, mobileno, adharNo, country, state, city, residentialAddress, permanentAddress, role, qualification, specialization, status';

function empColsForDb() {
  return config.dbType === 'postgres' ? empCols : empColsSqlite;
}

// GET /api/employees - list active employees
router.get('/', async (req, res) => {
  try {
    const rows = await db.query(
      'SELECT * FROM employee WHERE status = $1 ORDER BY eid',
      [1]
    );
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/employees/doctors - list active doctors (for assigning patients)
router.get('/doctors', async (req, res) => {
  try {
    const rows = await db.query(
      'SELECT eid, "firstName", "middleName", "lastName" FROM employee WHERE role = $1 AND status = $2',
      ['doctor', 1]
    );
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/employees/search?by=name&firstName=..&lastName=.. | by=eid&eid=.. | by=mobile&mobile=.. | by=adhar&adhar=..
router.get('/search', async (req, res) => {
  try {
    const { by, firstName, lastName, eid, mobile, adhar } = req.query;
    let rows = [];
    if (by === 'name' && firstName && lastName) {
      rows = await db.query('SELECT * FROM employee WHERE "firstName" = $1 AND "lastName" = $2 AND status = $3', [firstName, lastName, 1]);
    } else if (by === 'eid' && eid) {
      rows = await db.query('SELECT * FROM employee WHERE eid = $1 AND status = $2', [eid, 1]);
    } else if (by === 'mobile' && mobile) {
      rows = await db.query('SELECT * FROM employee WHERE mobileno = $1 AND status = $2', [Number(mobile), 1]);
    } else if (by === 'adhar' && adhar) {
      rows = await db.query('SELECT * FROM employee WHERE "adharNo" = $1 AND status = $2', [Number(adhar), 1]);
    } else {
      return res.status(400).json({ ok: false, message: 'Invalid search parameters' });
    }
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/employees - add employee (admin). Body: employee fields + createLogin (default true)
router.post('/', async (req, res) => {
  try {
    const gen = await db.get('SELECT eid, pid FROM idgenerate');
    const nextEid = (gen?.eid ?? 0) + 1;
    const eid = `EMP${String(nextEid).padStart(3, '0')}`;
    const {
      joiningDate, firstName, middleName, lastName, birthdate, gender, emailID, mobileno, adharNo,
      country, state, city, residentialAddress, permanentAddress, role, qualification, specialization,
      createLogin = true,
    } = req.body;
    const defaultPassword = String(adharNo || '');
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    await db.run(
      `UPDATE idgenerate SET eid = $1`,
      [nextEid]
    );
    const cols = empColsForDb();
    await db.run(
      `INSERT INTO employee (${cols}) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [joiningDate || new Date().toISOString().slice(0, 10), eid, firstName, middleName, lastName, birthdate, gender, emailID, Number(mobileno), Number(adharNo), country, state, city, residentialAddress, permanentAddress, role, qualification, specialization || null, 1]
    );
    if (createLogin) {
      await db.run(
        'INSERT INTO login (id, role, username, password) VALUES ($1, $2, $3, $4)',
        [eid, role, eid, passwordHash]
      );
    }
    res.status(201).json({ ok: true, eid });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PUT /api/employees/:eid - update employee
router.put('/:eid', async (req, res) => {
  try {
    const { eid } = req.params;
    const { firstName, middleName, lastName, birthdate, gender, emailID, mobileno, adharNo, country, state, city, residentialAddress, permanentAddress, qualification, specialization } = req.body;
    await db.run(
      `UPDATE employee SET "firstName"=$1,"middleName"=$2,"lastName"=$3,birthdate=$4,gender=$5,"emailID"=$6,mobileno=$7,"adharNo"=$8,country=$9,state=$10,city=$11,"residentialAddress"=$12,"permanentAddress"=$13,qualification=$14,specialization=$15 WHERE eid=$16`,
      [firstName, middleName, lastName, birthdate, gender, emailID, Number(mobileno), Number(adharNo), country, state, city, residentialAddress, permanentAddress, qualification, specialization, eid]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// DELETE /api/employees/:eid - soft delete (set status=0)
router.delete('/:eid', async (req, res) => {
  try {
    const { eid } = req.params;
    await db.run('UPDATE employee SET status = 0 WHERE eid = $1', [eid]);
    await db.run('DELETE FROM opd WHERE doctorid = $1 AND status = 1', [eid]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
