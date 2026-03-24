const db = require('../db');

async function resolveSingleHospitalOrgId() {
  const row = await db.get("SELECT id FROM organizations WHERE type = $1 ORDER BY created_at ASC LIMIT 1", ['hospital']);
  if (row?.id) return row.id;
  const fallback = await db.get('SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1');
  return fallback?.id || null;
}

async function ensureOrgContext(req) {
  if (req?.orgId) return req.orgId;
  if (req?.user?.org_id) {
    req.orgId = req.user.org_id;
    return req.orgId;
  }
  const orgId = await resolveSingleHospitalOrgId();
  if (orgId) {
    if (req?.user) req.user.org_id = orgId;
    req.orgId = orgId;
    return orgId;
  }
  if (req) req.orgId = null;
  return null;
}

async function requireOrgActive(req, res, next) {
  if (!req.user) return next();
  const orgId = await ensureOrgContext(req);
  if (!orgId) return next();
  try {
    const row = await db.get('SELECT status FROM organizations WHERE id = $1', [orgId]);
    if (row?.status === 'suspended') {
      return res.status(403).json({ ok: false, message: 'Organization is suspended' });
    }
  } catch (_) {}
  next();
}

module.exports = { requireOrgActive, ensureOrgContext };
