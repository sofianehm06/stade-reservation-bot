// Commande /mesreservations : liste les réservations de l'utilisateur.
const db = require('../db');
const { dateLisible, dateAujourdhui } = require('../utils');

// Libellé lisible d'un statut.
const LIBELLE_STATUT = {
  pending: '⏳ En attente',
  confirmed: '✅ Confirmée',
  rejected: '❌ Refusée',
};

module.exports = function handleMesReservations(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const reservations = db.getReservationsUtilisateur(userId);

  if (reservations.length === 0) {
    bot.sendMessage(chatId, 'Vous n\'avez aucune réservation. Utilisez /reserver pour en créer une.');
    return;
  }

  const aujourdhui = dateAujourdhui();
  const lignes = reservations.map((r) => {
    const passee = r.date < aujourdhui;
    const marqueur = passee ? '🕓 (passée)' : '📌 (à venir)';
    return (
      `${marqueur} ${dateLisible(r.date)} · ${r.heure_debut}-${r.heure_fin}\n` +
      `   ${LIBELLE_STATUT[r.statut] || r.statut}`
    );
  });

  bot.sendMessage(chatId, '📋 *Vos réservations :*\n\n' + lignes.join('\n\n'), {
    parse_mode: 'Markdown',
  });
};
