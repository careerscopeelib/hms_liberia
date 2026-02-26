/**
 * Structured, unique, human-readable ID generation.
 * All new IDs follow patterns: YYYY-NNNNN (patient MRN), PREFIX-YYYYMMDD-NNNN (encounters, invoices, etc.), PREFIX-YYYY-NNNNN (users, orgs).
 */

const db = require('../db');

const YEAR = String(new Date().getFullYear());
const TODAY = YEAR + String(new Date().getMonth() + 1).padStart(2, '0') + String(new Date().getDate()).padStart(2, '0');

/**
 * Next MRN (patient id) for org: YYYY-NNNNN e.g. 2026-00001 (per org, per year).
 */
async function getNextMrn(orgId) {
  const prefix = YEAR + '-';
  const rows = await db.query(
    'SELECT mrn FROM patient_org WHERE org_id = $1 AND mrn LIKE $2 ORDER BY mrn DESC LIMIT 1',
    [orgId, prefix + '%']
  );
  const last = rows[0]?.mrn || '';
  const num = last ? (parseInt(last.slice(prefix.length), 10) || 0) : 0;
  return prefix + String(num + 1).padStart(5, '0');
}

/**
 * Next encounter ID: ENC-YYYYMMDD-NNNN e.g. ENC-20260226-0001 (per org, per day).
 */
async function getNextEncounterId(orgId) {
  const prefix = 'ENC-' + TODAY + '-';
  const rows = await db.query(
    'SELECT id FROM encounters WHERE org_id = $1 AND id LIKE $2 ORDER BY id DESC LIMIT 1',
    [orgId, prefix + '%']
  );
  const last = rows[0]?.id || '';
  const num = last ? (parseInt(last.slice(prefix.length), 10) || 0) : 0;
  return prefix + String(num + 1).padStart(4, '0');
}

/**
 * Next user ID: USR-YYYY-NNNNN e.g. USR-2026-00001 (global).
 */
async function getNextUserId() {
  const prefix = 'USR-' + YEAR + '-';
  const rows = await db.query(
    "SELECT id FROM system_users WHERE id LIKE $1 ORDER BY id DESC LIMIT 1",
    [prefix + '%']
  );
  const last = rows[0]?.id || '';
  const num = last ? (parseInt(last.slice(prefix.length), 10) || 0) : 0;
  return prefix + String(num + 1).padStart(5, '0');
}

/**
 * Next organization ID: ORG-YYYY-NNNNN e.g. ORG-2026-00001.
 */
async function getNextOrganizationId() {
  const prefix = 'ORG-' + YEAR + '-';
  const rows = await db.query(
    "SELECT id FROM organizations WHERE id LIKE $1 ORDER BY id DESC LIMIT 1",
    [prefix + '%']
  );
  const last = rows[0]?.id || '';
  const num = last ? (parseInt(last.slice(prefix.length), 10) || 0) : 0;
  return prefix + String(num + 1).padStart(5, '0');
}

/**
 * Next invoice ID: INV-YYYYMMDD-NNNN (per org, per day).
 */
async function getNextInvoiceId(orgId) {
  const prefix = 'INV-' + TODAY + '-';
  const rows = await db.query(
    `SELECT i.id FROM invoices i JOIN encounters e ON e.id = i.encounter_id WHERE e.org_id = $1 AND i.id LIKE $2 ORDER BY i.id DESC LIMIT 1`,
    [orgId, prefix + '%']
  );
  const last = rows[0]?.id || '';
  const num = last ? (parseInt(last.slice(prefix.length), 10) || 0) : 0;
  return prefix + String(num + 1).padStart(4, '0');
}

/**
 * Next payment ID: PAY-YYYYMMDD-NNNN (global per day).
 */
async function getNextPaymentId() {
  const prefix = 'PAY-' + TODAY + '-';
  const rows = await db.query(
    "SELECT id FROM payments WHERE id LIKE $1 ORDER BY id DESC LIMIT 1",
    [prefix + '%']
  );
  const last = rows[0]?.id || '';
  const num = last ? (parseInt(last.slice(prefix.length), 10) || 0) : 0;
  return prefix + String(num + 1).padStart(4, '0');
}

/**
 * Next billing charge ID: CH-YYYYMMDD-NNNN (per org, per day).
 */
async function getNextChargeId(orgId) {
  const prefix = 'CH-' + TODAY + '-';
  const rows = await db.query(
    `SELECT c.id FROM billing_charges c JOIN encounters e ON e.id = c.encounter_id WHERE e.org_id = $1 AND c.id LIKE $2 ORDER BY c.id DESC LIMIT 1`,
    [orgId, prefix + '%']
  );
  const last = rows[0]?.id || '';
  const num = last ? (parseInt(last.slice(prefix.length), 10) || 0) : 0;
  return prefix + String(num + 1).padStart(4, '0');
}

/**
 * Next lab order ID: LAB-YYYYMMDD-NNNN (per org, per day).
 */
async function getNextLabOrderId(orgId) {
  const prefix = 'LAB-' + TODAY + '-';
  const rows = await db.query(
    `SELECT l.id FROM lab_orders l JOIN encounters e ON e.id = l.encounter_id WHERE e.org_id = $1 AND l.id LIKE $2 ORDER BY l.id DESC LIMIT 1`,
    [orgId, prefix + '%']
  );
  const last = rows[0]?.id || '';
  const num = last ? (parseInt(last.slice(prefix.length), 10) || 0) : 0;
  return prefix + String(num + 1).padStart(4, '0');
}

/**
 * Next prescription ID: RX-YYYYMMDD-NNNN (per org, per day).
 */
async function getNextPrescriptionId(orgId) {
  const prefix = 'RX-' + TODAY + '-';
  const rows = await db.query(
    `SELECT p.id FROM prescriptions p JOIN encounters e ON e.id = p.encounter_id WHERE e.org_id = $1 AND p.id LIKE $2 ORDER BY p.id DESC LIMIT 1`,
    [orgId, prefix + '%']
  );
  const last = rows[0]?.id || '';
  const num = last ? (parseInt(last.slice(prefix.length), 10) || 0) : 0;
  return prefix + String(num + 1).padStart(4, '0');
}

/**
 * Next case ID: CASE-YYYYMMDD-NNNN (per org, per day).
 */
async function getNextCaseId(orgId) {
  const prefix = 'CASE-' + TODAY + '-';
  const rows = await db.query(
    "SELECT id FROM cases WHERE org_id = $1 AND id LIKE $2 ORDER BY id DESC LIMIT 1",
    [orgId, prefix + '%']
  );
  const last = rows[0]?.id || '';
  const num = last ? (parseInt(last.slice(prefix.length), 10) || 0) : 0;
  return prefix + String(num + 1).padStart(4, '0');
}

/**
 * Next insurance policy ID: INS-YYYYMMDD-NNNN (per org, per day).
 */
async function getNextInsuranceId(orgId) {
  const prefix = 'INS-' + TODAY + '-';
  const rows = await db.query(
    "SELECT id FROM insurance_policies WHERE org_id = $1 AND id LIKE $2 ORDER BY id DESC LIMIT 1",
    [orgId, prefix + '%']
  );
  const last = rows[0]?.id || '';
  const num = last ? (parseInt(last.slice(prefix.length), 10) || 0) : 0;
  return prefix + String(num + 1).padStart(4, '0');
}

/**
 * Next appointment ID: APT-YYYYMMDD-NNNN (per org, per day).
 */
async function getNextAppointmentId(orgId) {
  const prefix = 'APT-' + TODAY + '-';
  const rows = await db.query(
    "SELECT id FROM appointments WHERE org_id = $1 AND id LIKE $2 ORDER BY id DESC LIMIT 1",
    [orgId, prefix + '%']
  );
  const last = rows[0]?.id || '';
  const num = last ? (parseInt(last.slice(prefix.length), 10) || 0) : 0;
  return prefix + String(num + 1).padStart(4, '0');
}

/**
 * Next noticeboard ID: NB-YYYYMMDD-NNNN.
 */
async function getNextNoticeId(orgId) {
  const prefix = 'NB-' + TODAY + '-';
  const rows = await db.query(
    "SELECT id FROM noticeboard WHERE org_id = $1 AND id LIKE $2 ORDER BY id DESC LIMIT 1",
    [orgId, prefix + '%']
  );
  const last = rows[0]?.id || '';
  const num = last ? (parseInt(last.slice(prefix.length), 10) || 0) : 0;
  return prefix + String(num + 1).padStart(4, '0');
}

/**
 * Next transfer ID: XF-YYYYMMDD-NNNN.
 */
async function getNextTransferId() {
  const prefix = 'XF-' + TODAY + '-';
  const rows = await db.query(
    "SELECT id FROM patient_transfers WHERE id LIKE $1 ORDER BY id DESC LIMIT 1",
    [prefix + '%']
  );
  const last = rows[0]?.id || '';
  const num = last ? (parseInt(last.slice(prefix.length), 10) || 0) : 0;
  return prefix + String(num + 1).padStart(4, '0');
}

/**
 * Document IDs: DOC-YYYYMMDD-NNNN, EDOC-YYYYMMDD-NNNN (fallback to random if table missing).
 */
async function getNextDocumentId() {
  try {
    const prefix = 'DOC-' + TODAY + '-';
    const rows = await db.query(
      "SELECT id FROM patient_documents WHERE id LIKE $1 ORDER BY id DESC LIMIT 1",
      [prefix + '%']
    );
    const last = rows[0]?.id || '';
    const num = last ? (parseInt(last.slice(prefix.length), 10) || 0) : 0;
    return prefix + String(num + 1).padStart(4, '0');
  } catch (_) {
    return 'DOC-' + require('crypto').randomBytes(6).toString('hex');
  }
}

async function getNextEntityDocumentId() {
  try {
    const prefix = 'EDOC-' + TODAY + '-';
    const rows = await db.query(
      "SELECT id FROM entity_documents WHERE id LIKE $1 ORDER BY id DESC LIMIT 1",
      [prefix + '%']
    );
    const last = rows[0]?.id || '';
    const num = last ? (parseInt(last.slice(prefix.length), 10) || 0) : 0;
    return prefix + String(num + 1).padStart(4, '0');
  } catch (_) {
    return 'EDOC-' + require('crypto').randomBytes(6).toString('hex');
  }
}

/**
 * Department / ward / store / service / bed / schedule / chat: keep short prefix + date + seq for readability.
 * DEPT-YYYYMMDD-NNN, WARD-YYYYMMDD-NNN, etc.
 */
async function getNextPrefixedId(table, idColumn, prefix, orgIdColumn, orgId) {
  const fullPrefix = prefix + TODAY + '-';
  const whereClause = orgIdColumn ? ` WHERE ${orgIdColumn} = $1 AND ${idColumn} LIKE $2` : ` WHERE ${idColumn} LIKE $1`;
  const orderBy = ` ORDER BY ${idColumn} DESC LIMIT 1`;
  const params = orgIdColumn ? [orgId, fullPrefix + '%'] : [fullPrefix + '%'];
  const rows = await db.query(`SELECT ${idColumn} as id FROM ${table}${whereClause}${orderBy}`, params);
  const last = rows[0]?.id || '';
  const num = last ? (parseInt(last.slice(fullPrefix.length), 10) || 0) : 0;
  return fullPrefix + String(num + 1).padStart(3, '0');
}

module.exports = {
  getNextMrn,
  getNextEncounterId,
  getNextUserId,
  getNextOrganizationId,
  getNextInvoiceId,
  getNextPaymentId,
  getNextChargeId,
  getNextLabOrderId,
  getNextPrescriptionId,
  getNextCaseId,
  getNextInsuranceId,
  getNextAppointmentId,
  getNextNoticeId,
  getNextTransferId,
  getNextDocumentId,
  getNextEntityDocumentId,
  getNextPrefixedId,
};
