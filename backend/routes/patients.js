const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/patients - list all
router.get('/', async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM patient ORDER BY pid');
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/patients/search?by=name&firstName=..&lastName=.. | by=pid&pid=.. | by=mobile&mobile=.. | by=adhar&adhar=..
router.get('/search', async (req, res) => {
  try {
    const { by, firstName, lastName, pid, mobile, adhar } = req.query;
    let rows = [];
    if (by === 'name' && firstName && lastName) {
      rows = await db.query('SELECT * FROM patient WHERE "firstName" = $1 AND "lastName" = $2', [firstName, lastName]);
    } else if (by === 'pid' && pid) {
      rows = await db.query('SELECT * FROM patient WHERE pid = $1', [pid]);
    } else if (by === 'mobile' && mobile) {
      rows = await db.query('SELECT * FROM patient WHERE mobileno = $1', [Number(mobile)]);
    } else if (by === 'adhar' && adhar) {
      rows = await db.query('SELECT * FROM patient WHERE "adharNo" = $1', [Number(adhar)]);
    } else {
      return res.status(400).json({ ok: false, message: 'Invalid search parameters' });
    }
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/patients - add patient
router.post('/', async (req, res) => {
  try {
    const gen = await db.get('SELECT eid, pid FROM idgenerate');
    const nextPid = (gen?.pid ?? 0) + 1;
    const pid = `P${nextPid}`;
    const {
      registrationDate, firstName, middleName, lastName, birthdate, gender, emailID, mobileno, adharNo,
      country, state, city, residentialAddress, permanentAddress, bloodGroup, chronicDiseases, medicineAllergy, doctorId,
    } = req.body;
    await db.run('UPDATE idgenerate SET pid = $1', [nextPid]);
    await db.run(
      `INSERT INTO patient ("registrationDate", pid, "firstName", "middleName", "lastName", birthdate, gender, "emailID", mobileno, "adharNo", country, state, city, "residentialAddress", "permanentAddress", "bloodGroup", "chronicDiseases", "medicineAllergy", "doctorId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [registrationDate || new Date().toISOString().slice(0, 10), pid, firstName, middleName, lastName, birthdate, gender, emailID, Number(mobileno), Number(adharNo), country, state, city, residentialAddress, permanentAddress, bloodGroup || null, chronicDiseases || null, medicineAllergy || null, doctorId || null]
    );
    res.status(201).json({ ok: true, pid });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PUT /api/patients/:pid - update patient
router.put('/:pid', async (req, res) => {
  try {
    const { pid } = req.params;
    const { firstName, middleName, lastName, birthdate, gender, emailID, mobileno, adharNo, country, state, city, residentialAddress, permanentAddress, bloodGroup, chronicDiseases, medicineAllergy, doctorId } = req.body;
    await db.run(
      `UPDATE patient SET "firstName"=$1,"middleName"=$2,"lastName"=$3,birthdate=$4,gender=$5,"emailID"=$6,mobileno=$7,"adharNo"=$8,country=$9,state=$10,city=$11,"residentialAddress"=$12,"permanentAddress"=$13,"bloodGroup"=$14,"chronicDiseases"=$15,"medicineAllergy"=$16,"doctorId"=$17 WHERE pid=$18`,
      [firstName, middleName, lastName, birthdate, gender, emailID, Number(mobileno), Number(adharNo), country, state, city, residentialAddress, permanentAddress, bloodGroup, chronicDiseases, medicineAllergy, doctorId || null, pid]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// DELETE /api/patients/:pid - delete patient (and their OPD entries)
router.delete('/:pid', async (req, res) => {
  try {
    const { pid } = req.params;
    await db.run('DELETE FROM opddetails WHERE opdid IN (SELECT opdid FROM opd WHERE pid = $1)', [pid]);
    await db.run('DELETE FROM opd WHERE pid = $1', [pid]);
    await db.run('DELETE FROM patient WHERE pid = $1', [pid]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
