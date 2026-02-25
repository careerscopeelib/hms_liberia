require('dotenv').config();

// Keep process alive on uncaught errors; log and let PM2 restart if needed
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const express = require('express');
const cors = require('cors');
const config = require('./config');
const db = require('./db');

const authRoutes = require('./routes/auth');
const employeesRoutes = require('./routes/employees');
const patientsRoutes = require('./routes/patients');
const opdRoutes = require('./routes/opd');
const statsRoutes = require('./routes/stats');
const uhpcmsAuth = require('./routes/uhpcms-auth');
const uhpcmsSettings = require('./routes/uhpcms-settings');
const governance = require('./routes/governance');
const uhpcmsBilling = require('./routes/uhpcms-billing');
const uhpcmsEncounters = require('./routes/uhpcms-encounters');
const uhpcmsPatients = require('./routes/uhpcms-patients');
const uhpcmsOrgAdmin = require('./routes/uhpcms-org-admin');
const uhpcmsTriage = require('./routes/uhpcms-triage');
const uhpcmsLab = require('./routes/uhpcms-lab');
const uhpcmsInpatient = require('./routes/uhpcms-inpatient');
const uhpcmsPharmacy = require('./routes/uhpcms-pharmacy');
const uhpcmsClinic = require('./routes/uhpcms-clinic');
const uhpcmsReporting = require('./routes/uhpcms-reporting');
const uhpcmsAudit = require('./routes/uhpcms-audit');

const app = express();
// CORS: allow single origin (string), array of origins, or true for all
const corsOpts = config.corsOrigin === true
  ? {}
  : Array.isArray(config.corsOrigin)
    ? { origin: config.corsOrigin }
    : { origin: config.corsOrigin };
app.use(cors(corsOpts));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/opd', opdRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/uhpcms/auth', uhpcmsAuth);
app.use('/api/uhpcms/settings', uhpcmsSettings);
app.use('/api/uhpcms/governance', governance);
app.use('/api/uhpcms/billing', uhpcmsBilling);
app.use('/api/uhpcms/encounters', uhpcmsEncounters);
app.use('/api/uhpcms/patients', uhpcmsPatients);
app.use('/api/uhpcms/org-admin', uhpcmsOrgAdmin);
app.use('/api/uhpcms/triage', uhpcmsTriage);
app.use('/api/uhpcms/lab', uhpcmsLab);
app.use('/api/uhpcms/inpatient', uhpcmsInpatient);
app.use('/api/uhpcms/pharmacy', uhpcmsPharmacy);
app.use('/api/uhpcms/clinic', uhpcmsClinic);
app.use('/api/uhpcms/reporting', uhpcmsReporting);
app.use('/api/uhpcms/audit', uhpcmsAudit);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, db: config.dbType });
});

async function start() {
  await db.init();
  const server = app.listen(config.port, () => {
    console.log(`Hospital Management API running at http://localhost:${config.port} (DB: ${config.dbType})`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${config.port} is already in use. Stop the other process or set PORT in .env`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
