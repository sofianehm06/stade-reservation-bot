// Commande /start : message de bienvenue.
module.exports = function handleStart(bot, msg) {
  const chatId = msg.chat.id;
  const texte =
    '⚽ *Bienvenue sur le bot de réservation du stade communal !*\n\n' +
    'Voici comment réserver un créneau :\n\n' +
    '📅 /reserver — Choisir une date et un créneau libre\n' +
    '📋 /mesreservations — Voir mes réservations\n' +
    '❌ /annuler — Annuler une réservation\n\n' +
    'Le stade est ouvert de 8h à 22h, par créneaux d\'1 heure.\n' +
    'Après votre demande, le gérant confirme ou refuse, et vous recevez une notification. 🔔';

  bot.sendMessage(chatId, texte, { parse_mode: 'Markdown' });
};
