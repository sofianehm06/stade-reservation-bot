// Configuration PM2 pour faire tourner le bot en continu sur le serveur.
// Lancement : pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'stade-bot',
      script: 'bot.js',
      // Redémarre automatiquement en cas de crash.
      autorestart: true,
      // Si le bot crash en boucle, laisse un délai avant de réessayer.
      restart_delay: 3000,
      // Recharge les variables depuis le fichier .env (via dotenv dans config.js).
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
