// Chargement et validation de la configuration depuis les variables d'environnement.
require('dotenv').config();

const config = {
  // Token du bot fourni par BotFather
  token: process.env.TELEGRAM_BOT_TOKEN,
  // ID Telegram de l'admin (converti en nombre pour comparaison fiable)
  adminId: Number(process.env.ADMIN_TELEGRAM_ID),

  // Horaires d'ouverture du stade (heures entières)
  ouverture: 8,   // 8h
  fermeture: 22,  // 22h (dernier créneau : 21h-22h)
};

// Vérifications au démarrage pour éviter des erreurs silencieuses.
if (!config.token) {
  console.error('❌ TELEGRAM_BOT_TOKEN manquant. Copiez .env.example vers .env et renseignez-le.');
  process.exit(1);
}
if (!config.adminId || Number.isNaN(config.adminId)) {
  console.error('❌ ADMIN_TELEGRAM_ID manquant ou invalide (doit être un nombre).');
  process.exit(1);
}

module.exports = config;
