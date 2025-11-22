module.exports = {
  apps: [{
    name: 'mcp2rest',
    script: './dist/bin/mcp2rest.js',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '~/.mcp2rest/logs/error.log',
    out_file: '~/.mcp2rest/logs/out.log',
    log_file: '~/.mcp2rest/logs/combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
