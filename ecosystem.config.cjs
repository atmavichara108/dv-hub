module.exports = {
  apps: [
    {
      name: 'dvhub',
      script: 'dist/server.js',
      cwd: '/opt/dv-hub',
      node_args: '--enable-source-maps',
      env: {
        NODE_ENV: 'production',
        PORT: 8787,
        DB_PATH: './data/dv-hub.db',
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '~/.pm2/logs/dvhub-error.log',
      out_file: '~/.pm2/logs/dvhub-out.log',
    },
  ],
}
