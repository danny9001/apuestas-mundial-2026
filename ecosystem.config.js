// Secrets must be set in the OS environment or .env.local — never hardcode them here.
// Required: SYNC_SECRET, SCHEDULER_SECRET, JWT_SECRET, DB_*, FOOTBALL_API_KEY, ...
// See .env.example for the full list.
const required = ['SYNC_SECRET', 'SCHEDULER_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[ecosystem] FATAL: environment variable ${key} is not set`);
    process.exit(1);
  }
}

module.exports = {
  apps: [
    {
      name: 'elitepass-mundial',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3002',
      exec_mode: 'cluster',
      instances: 4,
      env: {
        NODE_ENV: 'production',
      }
    },
    {
      name: 'elitepass-scheduler',
      script: 'scheduler.js',
      env: {
        NODE_ENV: 'production',
        APP_BASE_URL: 'http://localhost:3002',
      }
    }
  ]
};
