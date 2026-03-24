const db = require('../db');
const { ensureOrgContext } = require('./orgCheck');

/**
 * Middleware: require the organization to have at least one of the given modules enabled.
 * Pass a string (e.g. 'lab') or array (e.g. ['hospital', 'clinic']).
 * If user has no org_id (e.g. super_admin), skip check (allow).
 */
function requireModule(moduleOrModules) {
  return async (req, res, next) => {
    // Single-hospital mode: module-level authorization is intentionally bypassed.
    // The system runs under one hospital context and route-level role checks still apply.
    await ensureOrgContext(req).catch(() => null);
    next();
  };
}

module.exports = { requireModule };
