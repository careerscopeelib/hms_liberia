const { ensureOrgContext } = require('./orgCheck');

async function requireOrgContext(req, res, next) {
  try {
    // Single-hospital mode: always resolve to the configured default hospital.
    // Ignore client-supplied org_id to avoid cross-org authorization noise.
    const orgId = await ensureOrgContext(req);
    if (!orgId) return res.status(400).json({ ok: false, message: 'Hospital is not configured yet' });
    req.orgId = orgId;
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'org_id')) req.body.org_id = orgId;
    next();
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
}

module.exports = { requireOrgContext };
