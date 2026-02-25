const db = require('../db');

/**
 * Middleware: require the organization to have at least one of the given modules enabled.
 * Pass a string (e.g. 'lab') or array (e.g. ['hospital', 'clinic']).
 * If user has no org_id (e.g. super_admin), skip check (allow).
 */
function requireModule(moduleOrModules) {
  const modules = Array.isArray(moduleOrModules) ? moduleOrModules : [moduleOrModules];
  return async (req, res, next) => {
    if (!req.user) return next();
    const orgId = req.user.org_id;
    if (!orgId) return next(); // super_admin or no org: allow
    try {
      const placeholders = modules.map((_, i) => `$${i + 1}`).join(',');
      const row = await db.get(
        `SELECT 1 FROM org_modules WHERE org_id = $${modules.length + 1} AND module_name IN (${placeholders}) AND enabled = 1 LIMIT 1`,
        [...modules, orgId]
      );
      if (!row) {
        return res.status(403).json({ ok: false, message: 'This feature is not enabled for your organization' });
      }
    } catch (e) {
      return res.status(500).json({ ok: false, message: e.message });
    }
    next();
  };
}

module.exports = { requireModule };
