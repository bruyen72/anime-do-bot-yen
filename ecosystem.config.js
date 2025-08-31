module.exports = {
  apps: [{
    name: 'yakabot',
    script: 'index.js',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '768M',
    restart_delay: 3000,
    max_restarts: 999,              // 🔥 RESTART INFINITO
    min_uptime: '5s',
    autorestart: true,              // 🔥 SEMPRE RESTART
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      PM2_SERVE_PATH: '.',
      PM2_SERVE_PORT: 3000
    }
  }]
};
