const config = require('../config');

const adapter = config.dbType === 'postgres' ? require('./postgres') : require('./sqlite');

async function init() {
  if (adapter.init) return adapter.init();
  return Promise.resolve();
}

module.exports = {
  init,
  query: adapter.query,
  get: adapter.get,
  run: adapter.run,
};
