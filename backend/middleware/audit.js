const db = require('../db');

function audit(module, action) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      const userId = req.user?.sub || req.user?.id;
      const orgId = req.user?.org_id || null;
      const payload = JSON.stringify({
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.body ? Object.keys(req.body) : [],
      });
      Promise.resolve()
        .then(() =>
          db.run(
            'INSERT INTO audit_log (user_id, org_id, module, action, payload) VALUES ($1, $2, $3, $4, $5)',
            [userId, orgId, module, action, payload]
          )
        )
        .catch(() => {});
      return originalJson(body);
    };
    next();
  };
}

module.exports = { audit };
