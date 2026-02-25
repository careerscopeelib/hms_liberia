const express = require('express');
const db = require('../db');
const config = require('../config');

const router = express.Router();
const isPg = config.dbType === 'postgres';

// OPD status: 0 = in queue, 1 = with doctor (pending), 2 = completed (prescription done)

// GET /api/opd - list by status (query: status=0|1|2) or all
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let rows;
    if (status !== undefined && status !== '') {
      rows = await db.query('SELECT * FROM opd WHERE status = $1 ORDER BY opdid', [Number(status)]);
    } else {
      rows = await db.query('SELECT * FROM opd ORDER BY opdid');
    }
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/opd/doctor/:doctorId - list OPD entries for doctor (status=1 pending)
router.get('/doctor/:doctorId', async (req, res) => {
  try {
    const rows = await db.query(
      'SELECT opdid, visitdate, pid, doctorid, status FROM opd WHERE doctorid = $1 AND status = 1 ORDER BY opdid',
      [req.params.doctorId]
    );
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/opd - add to OPD queue. Body: { pid, doctorid }
router.post('/', async (req, res) => {
  try {
    const { pid, doctorid } = req.body || {};
    if (!pid || !doctorid) return res.status(400).json({ ok: false, message: 'pid and doctorid required' });
    const visitdate = new Date().toISOString().slice(0, 10);
    if (isPg) {
      const rows = await db.query(
        'INSERT INTO opd (visitdate, pid, doctorid, status) VALUES ($1,$2,$3,$4) RETURNING opdid',
        [visitdate, pid, doctorid, 0]
      );
      res.status(201).json({ ok: true, opdid: rows[0].opdid });
    } else {
      const r = db.run('INSERT INTO opd (visitdate, pid, doctorid, status) VALUES ($1,$2,$3,$4)', [visitdate, pid, doctorid, 0]);
      res.status(201).json({ ok: true, opdid: r.lastID });
    }
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// DELETE /api/opd/queue/:pid - remove from queue (delete where status=1 or set status=0)
router.delete('/queue/:pid', async (req, res) => {
  try {
    await db.run('DELETE FROM opd WHERE pid = $1 AND status = 1', [req.params.pid]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// DELETE /api/opd/:opdid - remove OPD entry (e.g. from waiting queue)
router.delete('/:opdid', async (req, res) => {
  try {
    const opdid = req.params.opdid;
    await db.run('DELETE FROM opddetails WHERE opdid = $1', [opdid]);
    await db.run('DELETE FROM opd WHERE opdid = $1', [opdid]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PUT /api/opd/:opdid/complete - set status=2 (completed)
router.put('/:opdid/complete', async (req, res) => {
  try {
    await db.run('UPDATE opd SET status = 2 WHERE opdid = $1', [req.params.opdid]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/opd/:opdid/details - get opddetails for an opd
router.get('/:opdid/details', async (req, res) => {
  try {
    const row = await db.get('SELECT * FROM opddetails WHERE opdid = $1', [req.params.opdid]);
    res.json({ ok: true, data: row });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PUT /api/opd/:opdid/details - upsert prescription (opddetails)
router.put('/:opdid/details', async (req, res) => {
  try {
    const opdid = req.params.opdid;
    const { symptoms, diagnosis, medicinesDose, dos, donts, investigations, followupDate, fees } = req.body || {};
    const existing = await db.get('SELECT opdid FROM opddetails WHERE opdid = $1', [opdid]);
    if (existing) {
      await db.run(
        `UPDATE opddetails SET symptoms=$1, diagnosis=$2, "medicinesDose"=$3, dos=$4, donts=$5, investigations=$6, "followupDate"=$7, fees=$8 WHERE opdid=$9`,
        [symptoms, diagnosis, medicinesDose, dos, donts, investigations, followupDate, fees, opdid]
      );
    } else {
      await db.run(
        `INSERT INTO opddetails (opdid, symptoms, diagnosis, "medicinesDose", dos, donts, investigations, "followupDate", fees) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [opdid, symptoms, diagnosis, medicinesDose, dos, donts, investigations, followupDate, fees || '0']
      );
    }
    await db.run('UPDATE opd SET status = 2 WHERE opdid = $1', [opdid]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/opd/patient/:pid/history - OPD history for patient (status=2 completed)
router.get('/patient/:pid/history', async (req, res) => {
  try {
    const rows = await db.query(
      'SELECT o.opdid, o.visitdate, o.doctorid, o.status, d.symptoms, d.diagnosis, d."medicinesDose", d.dos, d.donts, d.investigations, d."followupDate", d.fees FROM opd o LEFT JOIN opddetails d ON o.opdid = d.opdid WHERE o.pid = $1 ORDER BY o.opdid DESC',
      [req.params.pid]
    );
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
