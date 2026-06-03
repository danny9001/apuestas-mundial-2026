module.exports = {
  apps: [
    {
      name: 'mundial-2026',
      script: 'node_modules/.bin/next',
      args: 'start --port 3002',
      cwd: '/home/soporte/apuestas-mundial-2026',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: '3002',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '512M',
      restart_delay: 3000,
      watch: false,
    },
    {
      name: 'mundial-scheduler',
      script: 'scheduler.js',
      cwd: '/home/soporte/apuestas-mundial-2026',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 */6 * * *', // reinicia cada 6h para limpiar memoria
      error_file: './logs/scheduler-error.log',
      out_file: './logs/scheduler-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      watch: false,
    },
  ],
};
