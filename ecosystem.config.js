module.exports = {
  apps: [
    {
      name: 'elitepass-mundial',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3002',
      exec_mode: 'cluster',
      instances: 4,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'elitepass-scheduler',
      script: 'scheduler.js',
      env: {
        NODE_ENV: 'production',
        APP_BASE_URL: 'http://localhost:3002',
        SCHEDULER_SECRET: 'D6q*K5@!46AQ4&c@2$Avc5x$',
        SYNC_SECRET: 'qPSaiExBS5AaGTU2WwLDvMZjEjGuabXMJhzTzde7MHM'
      }
    }
  ]
};
