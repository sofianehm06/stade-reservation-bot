// Commande /annuler : annulation d'une réservation en attente ou confirmée,
// avec une étape de confirmation avant l'annulation effective.
const db = require('../db');
const { dateLisible, dateAujourdhui } = require('../utils');

// --- Étape 1 : lister les réservations annulables ---
function handleAnnuler(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const reservations = db.getReservationsAnnulables(userId, dateAujourdhui());

  if (reservations.length === 0) {
    bot.sendMessage(chatId, 'Vous n\'avez aucune réservation à venir à annuler.');
    return;
  }

  const boutons = reservations.map((r) => [
    {
      text: `${dateLisible(r.date)} · ${r.heure_debut}-${r.heure_fin}`,
      callback_data: `annuler:${r.id}`,
    },
  ]);

  bot.sendMessage(chatId, '❌ Quelle réservation souhaitez-vous annuler ?', {
    reply_markup: { inline_keyboard: boutons },
  });
}

// --- Étape 2 : demander confirmation ---
function demanderConfirmation(bot, chatId, messageId, id, userId) {
  const r = db.getReservationParId(id);
  // Sécurité : la réservation doit exister et appartenir à l'utilisateur.
  if (!r || r.telegram_user_id !== userId) {
    bot.editMessageText('Réservation introuvable.', { chat_id: chatId, message_id: messageId });
    return;
  }

  bot.editMessageText(
    `Confirmer l'annulation du *${dateLisible(r.date)}* de *${r.heure_debut}* à *${r.heure_fin}* ?`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Oui, annuler', callback_data: `annuler_ok:${id}` },
            { text: '↩️ Non', callback_data: 'annuler_non' },
          ],
        ],
      },
    }
  );
}

// --- Étape 3 : effectuer l'annulation ---
function confirmerAnnulation(bot, chatId, messageId, id, userId) {
  const r = db.getReservationParId(id);
  if (!r || r.telegram_user_id !== userId) {
    bot.editMessageText('Réservation introuvable.', { chat_id: chatId, message_id: messageId });
    return;
  }
  if (!['pending', 'confirmed'].includes(r.statut)) {
    bot.editMessageText('Cette réservation ne peut plus être annulée.', {
      chat_id: chatId,
      message_id: messageId,
    });
    return;
  }

  // On marque la réservation comme "rejected" pour libérer le créneau.
  db.majStatut(id, 'rejected');

  bot.editMessageText(
    `✅ Réservation du *${dateLisible(r.date)}* (${r.heure_debut}-${r.heure_fin}) annulée.`,
    { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }
  );
}

module.exports = { handleAnnuler, demanderConfirmation, confirmerAnnulation };
