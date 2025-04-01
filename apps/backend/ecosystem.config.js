export default {
  apps: [{
    name: 'swoc-data-sync',
    script: 'src/scripts/schedule-data-sync.mjs',
    interpreter: 'node',
    watch: false,
    autorestart: true,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      NODE_TLS_REJECT_UNAUTHORIZED: '0'
    },
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    exp_backoff_restart_delay: 100,
    max_restarts: 10,
    min_uptime: '5s',
    pre_script: './src/scripts/cleanup-ports.sh'
  }]
}; 