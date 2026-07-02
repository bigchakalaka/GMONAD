// Configuration PM2.
//   pm2 start ecosystem.config.js
//   pm2 save && pm2 startup   (demarrage au boot)
module.exports = {
  apps: [
    {
      name: 'portasplit-monitor',
      script: 'index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '700M', // relance si fuite memoire (Playwright)
      time: true, // prefixe les logs PM2 d'un timestamp
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
