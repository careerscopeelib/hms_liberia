const { ensureOrgContext } = require('./orgCheck');

async function requireOrgContext(req, res, next) {
  try {
    const orgId = req.user?.org_id || req.body?.org_id || await ensureOrgContext(req);
    if (!orgId) return res.status(400).json({ ok: false, message: 'org_id required' });
    req.orgId = orgId;
    next();
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
}

module.exports = { requireOrgContext };
