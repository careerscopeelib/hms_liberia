const db = require('../db');

async function requireOrgActive(req, res, next) {
  if (!req.user) return next();
  const orgId = req.user.org_id;
  if (!orgId) return next();
  try {
    const row = await db.get('SELECT status FROM organizations WHERE id = $1', [orgId]);
    if (row?.status === 'suspended') {
      return res.status(403).json({ ok: false, message: 'Organization is suspended' });
    }
  } catch (_) {}
  next();
}

module.exports = { requireOrgActive };
