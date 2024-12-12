module.exports = {
  apps: [
    {
      name: 'greysuit_zipha_bot',
      script: process.env.NODE_ENV === 'development' ? 'npm run dev' : 'npm start',
      args: 'src/app.js',
      watch: process.env.NODE_ENV === 'development',
      node_version: '16.13.0',
      bun_version: '1.2.3',
      exec_mode: 'fork',
      // cron: '*/5 * * * *', // Run the bot every 5 minutes
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        DEBUG: process.env.NODE_ENV === 'development' ? '*' : undefined
      }
    }
  ]
};
// npx pm2 start ecosystem.config.js --daemon
// npx pm2 kill && npx pm2 reset all && npx pm2 start ecosystem.config.js --no-daemon 
// PAT_GIT = git remote set-url origin https://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@github.com/ziphatech/GreysuitFx_zipha_bot.git