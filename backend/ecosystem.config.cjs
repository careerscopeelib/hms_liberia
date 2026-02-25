module.exports = {
  apps: [{
    name: 'uhpcms-api',
    script: 'server.js',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_restarts: 50,
    min_uptime: '2s',
    max_memory_restart: '400M',
    env: { NODE_ENV: 'development' },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
  }],
};
